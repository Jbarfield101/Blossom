import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
vi.mock('../features/lofi/SongForm', () => ({
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

  afterEach(() => {
    cleanup();
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
    expect(call[1].spec.chord_span_beats).toBe(4);
    expect(call[1].spec).toMatchObject({
      ambience: ['rain'],
      ambienceLevel: 0.5,
      hq_stereo: true,
      hq_reverb: true,
      hq_sidechain: true,
      hq_chorus: true,
      limiter_drive: 1.02,
    });
    await waitFor(() => expect(listen).toHaveBeenCalledTimes(2));

    progressCb({ payload: JSON.stringify({ stage: 'render', message: '30%' }) });
    expect(await screen.findByText(/render: 30%/i)).toBeInTheDocument();

    resolveRun!('/tmp/out/song.wav');
    expect(await screen.findByText('done')).toBeInTheDocument();
    expect(screen.getByText('Play')).toBeInTheDocument();
  });

  it('generates a title with ollama', async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'general_chat') return Promise.resolve('Morning Chill');
      return Promise.resolve('');
    });

    render(<SongForm />);

    fireEvent.click(screen.getByText(/generate title/i));

    await waitFor(() => {
      const calls = (invoke as any).mock.calls.map(([c]: any) => c);
      expect(calls).toContain('start_ollama');
      expect(calls).toContain('general_chat');
    });

    await waitFor(() =>
      expect(
        (screen.getByPlaceholderText(/song title base/i) as HTMLInputElement).value
      ).toBe('Morning Chill')
    );
  });

  it('remembers last used template', () => {
    render(<SongForm />);
    const select = screen.getByLabelText(/song templates/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Study Session' } });
    expect(select.value).toBe('Study Session');
    cleanup();
    render(<SongForm />);
    expect(
      (screen.getByLabelText(/song templates/i) as HTMLSelectElement).value
    ).toBe('Study Session');
  });

  it('offers a no drums option', () => {
    render(<SongForm />);
    const label = screen.getByText('Drum Pattern');
    const select = label.parentElement!.querySelector('select') as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain('no_drums');
  });

  it('shows fantasy mood option', () => {
    render(<SongForm />);
    expect(screen.getByText('fantasy')).toBeInTheDocument();
  });

  it('passes selected instruments in spec', async () => {
    (open as any).mockResolvedValue('/tmp/out');
    (invoke as any).mockResolvedValue('');
    (listen as any).mockResolvedValue(() => {});

    render(<SongForm />);

    fireEvent.click(screen.getByText(/choose folder/i));
    await screen.findByText('/tmp/out');

    ['rhodes', 'nylon guitar', 'upright bass'].forEach((name) =>
      fireEvent.click(screen.getByText(name))
    );
    ['harp', 'lute', 'pan flute'].forEach((name) =>
      fireEvent.click(screen.getByText(name))
    );

    fireEvent.click(screen.getByText(/render songs/i));

    await waitFor(() => expect(invoke).toHaveBeenCalled());
    const call = (invoke as any).mock.calls.find(([c]: any) => c === 'run_lofi_song');
    expect(call[1].spec.instruments).toEqual(['harp', 'lute', 'pan flute']);
  });

  it('calls generate_album when album mode enabled', async () => {
    (open as any).mockResolvedValue('/tmp/out');
    (invoke as any).mockResolvedValue({});
    (listen as any).mockResolvedValue(() => {});

    render(<SongForm />);

    fireEvent.click(screen.getByText(/choose folder/i));
    await screen.findByText('/tmp/out');

    fireEvent.click(screen.getByLabelText(/album mode/i));
    fireEvent.click(screen.getByText(/create album/i));

    await waitFor(() => {
      const calls = (invoke as any).mock.calls.map(([c]: any) => c);
      expect(calls).toContain('generate_album');
    });
  });
});

