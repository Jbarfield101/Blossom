import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GeneralChat from './GeneralChat';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));

describe('GeneralChat', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it('handles message flow', async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'general_chat') return Promise.resolve('Reply');
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(<GeneralChat />);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Hello' } });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('general_chat', expect.anything()));
    expect(screen.getAllByText('Hello').length).toBeGreaterThan(0);
    expect(await screen.findByText('Reply')).toBeInTheDocument();
  });

  it('shows error when send fails', async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'general_chat') return Promise.reject('fail');
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(<GeneralChat />);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Hi' } });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);

    await waitFor(() => expect(screen.getByText('fail')).toBeInTheDocument());
  });
});

