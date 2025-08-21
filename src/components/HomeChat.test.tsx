import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HomeChat from './HomeChat';
import { invoke } from '@tauri-apps/api/core';
import { SystemInfo } from '../features/system/useSystemInfo';

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

  it('prompts for template and track count when missing', async () => {
    render(<HomeChat />);
    fireEvent.change(screen.getByPlaceholderText('Ask Blossom...'), {
      target: { value: '/music My Song' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => {
      expect(invoke).not.toHaveBeenCalled();
    });
    expect(
      await screen.findByText(/Please specify template and track count/i)
    ).toBeInTheDocument();
  });

  it('handles /music with template and tracks', async () => {
    (invoke as any).mockResolvedValue(undefined);
    render(<HomeChat />);
    fireEvent.change(screen.getByPlaceholderText('Ask Blossom...'), {
      target: {
        value: '/music My Song template="Classic Lofi" tracks=2',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('generate_album', {
        meta: {
          track_count: 2,
          title_base: 'My Song',
          template: 'Classic Lofi',
        },
      });
    });
    expect(
      await screen.findByText(
        'Started music generation for "My Song" using "Classic Lofi" with 2 tracks.'
      )
    ).toBeInTheDocument();
  });

  it('handles /sys command', async () => {
    const info: SystemInfo = { cpu_usage: 12, mem_usage: 34, gpu_usage: 56 };
    (invoke as any).mockResolvedValue(info);
    render(<HomeChat />);
    fireEvent.change(screen.getByPlaceholderText('Ask Blossom...'), {
      target: { value: '/sys' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('system_info');
    });
    const msg = await screen.findByText(/CPU: 12%/);
    expect(msg.textContent).toBe('CPU: 12%\nMemory: 34%\nGPU: 56%');
  });
});
