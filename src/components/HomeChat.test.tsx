import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HomeChat from './HomeChat';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('HomeChat', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('sends to general_chat', async () => {
    (invoke as any).mockResolvedValue('Reply');
    render(<HomeChat />);
    fireEvent.change(screen.getByPlaceholderText('Ask Blossom...'), {
      target: { value: 'Hello' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('general_chat', {
        messages: [{ role: 'user', content: 'Hello' }],
      });
    });
    expect(await screen.findByText('Reply')).toBeInTheDocument();
  });

  it('handles /music command', async () => {
    (invoke as any).mockResolvedValue(undefined);
    render(<HomeChat />);
    fireEvent.change(screen.getByPlaceholderText('Ask Blossom...'), {
      target: { value: '/music My Song' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('generate_album', {
        meta: { track_count: 1, title_base: 'My Song' },
      });
    });
    expect(
      await screen.findByText('Started music generation for "My Song".')
    ).toBeInTheDocument();
  });
});
