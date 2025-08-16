import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SongForm from './SongForm';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: (p: string) => p,
}));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));
vi.mock('../features/lofi/useLofiEngine', () => ({
  useLofi: () => ({
    isPlaying: false,
    play: vi.fn(),
    stop: vi.fn(),
    setBpm: vi.fn(),
    setKey: vi.fn(),
    setSeed: vi.fn(),
  }),
}));

describe('SongForm', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    Object.defineProperty(global.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(global.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('adds a job and shows progress', async () => {
    (open as any).mockResolvedValue('/tmp/out');
    let resolveRun: (p: string) => void;
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === 'run_lofi_song') {
        return new Promise<string>((res) => {
          resolveRun = res;
        });
      }
      return Promise.resolve('');
    });
    let progressCb: any;
    (listen as any).mockImplementation((_e: string, cb: any) => {
      progressCb = cb;
      return Promise.resolve(() => {});
    });

    render(<SongForm />);
    fireEvent.click(screen.getByText(/choose folder/i));
    await screen.findByText('/tmp/out');

    const autoPlay = screen.getByText(/Auto‑play last successful render/).previousSibling as HTMLInputElement;
    fireEvent.click(autoPlay);

    fireEvent.click(screen.getByText(/render songs/i));

    await waitFor(() => expect(invoke).toHaveBeenCalled());
    const call = (invoke as any).mock.calls.find(([c]: any) => c === 'run_lofi_song');
    expect(call[1].spec.structure[0]).toHaveProperty('chords');
    await waitFor(() => expect(listen).toHaveBeenCalledTimes(2));

    progressCb({ payload: JSON.stringify({ stage: 'render', message: '30%' }) });
    expect(await screen.findByText(/render: 30%/i)).toBeInTheDocument();

    resolveRun!('/tmp/out/song.wav');
    expect(await screen.findByText('done')).toBeInTheDocument();
    expect(screen.getByText('Play')).toBeInTheDocument();
  });
});

