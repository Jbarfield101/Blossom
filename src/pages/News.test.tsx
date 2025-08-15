import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import News from './News';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('News', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ id: 1, title: 'Title', summary: 'Summary' }]),
    }) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('forwards article text to general_chat with context', async () => {
    (invoke as any).mockResolvedValue('Answer');

    render(<News />);

    await screen.findByText('Title');
    const btn = screen.getByRole('button', { name: /ask about this/i });
    fireEvent.click(btn);

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(invoke).toHaveBeenCalledWith('general_chat', {
      messages: [{ role: 'user', content: expect.stringContaining('Summary') }],
    });

    fireEvent.click(btn);

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    const secondCall = (invoke as any).mock.calls[1][1];
    expect(secondCall.messages.length).toBe(3);
  });
});

