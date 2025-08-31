import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
  readFile: vi.fn().mockResolvedValue(new Uint8Array()),
}));

vi.mock('@tonejs/midi', () => ({
  Midi: vi.fn().mockImplementation(() => ({ duration: 1.23 })),
}));

const listeners: Record<string, (e: any) => void> = {};
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((event: string, cb: (e: any) => void) => {
    listeners[event] = cb;
    return Promise.resolve(() => delete listeners[event]);
  }),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/api/path', () => ({
  resolveResource: (p: string) =>
    Promise.resolve(`C:/Blossom/resources/${p}`.replace(/\//g, '\\')),
}));
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((p: string) => `http://asset.localhost/${p}`),
  invoke: vi.fn(),
}));

vi.mock('../utils/sfzLoader', () => ({
  loadSfz: vi.fn((_path: string, onProgress?: (l: number, t: number) => void) => {
    onProgress?.(1, 1);
    return Promise.resolve({ regions: [], sampler: {} } as any);
  }),
}));

vi.mock('../store/tasks', () => ({
  generateBasicSong: vi.fn(),
}));
import { generateBasicSong } from '../store/tasks';
import SFZSongForm from './SFZSongForm';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { loadSfz } from '../utils/sfzLoader';

describe('SFZSongForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    vi.mocked(invoke).mockResolvedValue({});
    for (const k of Object.keys(listeners)) delete listeners[k];
  });

  afterEach(() => {
    cleanup();
  });

  it('renders form with lofi filter off', async () => {
    render(<SFZSongForm />);
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByText('Choose Output Folder')).toBeInTheDocument();
    expect(screen.getByLabelText('Tempo')).toBeInTheDocument();
    expect(screen.getByLabelText('Key')).toBeInTheDocument();
    await screen.findByText('Change SFZ');
    const lofi = screen.getByLabelText('Lofi Filter');
    expect(lofi).not.toBeChecked();
  });

  it('calls generateBasicSong with default lofi filter', async () => {
    (openDialog as any).mockResolvedValueOnce('/tmp/out');

    render(<SFZSongForm />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Choose Output Folder'));
    await screen.findByText('Output: /tmp/out');
    await screen.findByText('Change SFZ');

    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => expect(generateBasicSong).toHaveBeenCalled());
    const spec = generateBasicSong.mock.calls[0][0];
    expect(spec.instruments).toEqual([]);
    expect(spec.ambience).toEqual([]);
    expect(spec.bpm).toBe(100);
    expect(spec.key).toBe('C');
    expect(spec.lofiFilter).toBe(false);
    expect(typeof spec.seed).toBe('number');
    expect(spec.seed).toBeLessThan(2 ** 32);
  });

  it('includes lofi filter when toggled', async () => {
    (openDialog as any).mockResolvedValueOnce('/tmp/out');

    render(<SFZSongForm />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Choose Output Folder'));
    await screen.findByText('Output: /tmp/out');
    await screen.findByText('Change SFZ');
    fireEvent.click(screen.getByLabelText('Lofi Filter'));

    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => expect(generateBasicSong).toHaveBeenCalled());
    const spec = generateBasicSong.mock.calls[0][0];
    expect(spec.lofiFilter).toBe(true);
  });

  it('includes custom tempo and key in spec', async () => {
    (openDialog as any).mockResolvedValueOnce('/tmp/out');

    render(<SFZSongForm />);
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByText('Choose Output Folder'));
    await screen.findByText('Output: /tmp/out');
    await screen.findByText('Change SFZ');
    fireEvent.change(screen.getByLabelText('Tempo'), {
      target: { value: '90' },
    });
    fireEvent.change(screen.getByLabelText('Key'), {
      target: { value: 'Dm' },
    });
    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => expect(generateBasicSong).toHaveBeenCalled());
    const spec = generateBasicSong.mock.calls[0][0];
    expect(spec.bpm).toBe(90);
    expect(spec.key).toBe('Dm');
  });

  it('prefills output directory from config', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({ sfz_out_dir: '/saved/out' });
    render(<SFZSongForm />);
    await screen.findByText('Change SFZ');
    expect(screen.getByText('Output: /saved/out')).toBeInTheDocument();
    await waitFor(() =>
      expect(localStorage.getItem('sfzOutDir')).toBe('/saved/out')
    );
    await waitFor(() =>
      expect(vi.mocked(invoke).mock.calls).toContainEqual([
        'save_paths',
        { sfz_out_dir: '/saved/out' },
      ])
    );
  });

  it('prefills output directory from localStorage when config missing', async () => {
    localStorage.setItem('sfzOutDir', '/stored/out');
    render(<SFZSongForm />);
    await screen.findByText('Change SFZ');
    expect(screen.getByText('Output: /stored/out')).toBeInTheDocument();
    await waitFor(() =>
      expect(vi.mocked(invoke).mock.calls).toContainEqual([
        'save_paths',
        { sfz_out_dir: '/stored/out' },
      ])
    );
  });

  it('persists chosen folder', async () => {
    (openDialog as any).mockResolvedValueOnce('/tmp/out');
    render(<SFZSongForm />);
    await screen.findByText('Change SFZ');
    fireEvent.click(screen.getByText('Choose Output Folder'));
    await screen.findByText('Output: /tmp/out');
    await waitFor(() =>
      expect(localStorage.getItem('sfzOutDir')).toBe('/tmp/out')
    );
    await waitFor(() =>
      expect(vi.mocked(invoke).mock.calls).toContainEqual([
        'save_paths',
        { sfz_out_dir: '/tmp/out' },
      ])
    );
  });

  it('remembers chosen SFZ instrument', async () => {
    (openDialog as any).mockResolvedValueOnce('/tmp/piano.sfz');

    const { unmount } = render(<SFZSongForm />);
    await screen.findByText('Change SFZ');
    fireEvent.click(screen.getByText('Change SFZ'));
    await waitFor(() => expect(localStorage.getItem('sfzInstrument')).toBe('/tmp/piano.sfz'));
    unmount();

    (openDialog as any).mockResolvedValueOnce('/tmp/out');
    render(<SFZSongForm />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Choose Output Folder'));
    await screen.findByText('Output: /tmp/out');
    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => expect(generateBasicSong).toHaveBeenCalled());
    const spec = generateBasicSong.mock.calls[0][0];
    expect(spec.sfzInstrument).toBe('/tmp/piano.sfz');
  });

  it('persists chosen MIDI file and sends in spec', async () => {
    (openDialog as any)
      .mockResolvedValueOnce('/tmp/out')
      .mockResolvedValueOnce('/tmp/song.mid');

    render(<SFZSongForm />);
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByText('Choose Output Folder'));
    await screen.findByText('Output: /tmp/out');
    await screen.findByText('Change SFZ');
    fireEvent.click(screen.getByText('Choose MIDI File'));
    await screen.findByText('MIDI: song.mid (0:00)');

    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => expect(generateBasicSong).toHaveBeenCalled());
    const spec = generateBasicSong.mock.calls[0][0];
    expect(spec.midiFile).toBe('/tmp/song.mid');
    expect(localStorage.getItem('midiFile')).toBe('/tmp/song.mid');
  });

  it('forwards gain slider value in spec', async () => {
    (openDialog as any).mockResolvedValueOnce('/tmp/out');
    render(<SFZSongForm />);
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByText('Choose Output Folder'));
    await screen.findByText('Output: /tmp/out');
    await screen.findByText('Change SFZ');
    const slider = screen.getByLabelText('Gain');
    fireEvent.change(slider, { target: { value: '0.5' } });
    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => expect(generateBasicSong).toHaveBeenCalled());
    const spec = generateBasicSong.mock.calls[0][0];
    expect(spec.gain).toBeCloseTo(0.5, 2);
  });

  it('normalizes default piano path before loading', async () => {
    render(<SFZSongForm />);
    await waitFor(() => expect(loadSfz).toHaveBeenCalled());
    expect(convertFileSrc).toHaveBeenCalledWith(
      'C:/Blossom/resources/sfz_sounds/piano.sfz'
    );
    expect(loadSfz).toHaveBeenCalledWith(
      'http://asset.localhost/C:/Blossom/resources/sfz_sounds/piano.sfz',
      expect.any(Function)
    );
  });

  it('normalizes user selected file before loading', async () => {
    (openDialog as any).mockResolvedValueOnce('C:\\tmp\\piano.sfz');

    render(<SFZSongForm />);
    await screen.findByText('Change SFZ');
    loadSfz.mockClear();
    vi.mocked(convertFileSrc).mockClear();

    fireEvent.click(screen.getByText('Change SFZ'));

    await waitFor(() => expect(loadSfz).toHaveBeenCalled());
    expect(convertFileSrc).toHaveBeenCalledWith('C:/tmp/piano.sfz');
    expect(loadSfz).toHaveBeenCalledWith(
      'http://asset.localhost/C:/tmp/piano.sfz',
      expect.any(Function)
    );
  });

  it('handles loader errors gracefully', async () => {
    vi.mocked(loadSfz).mockRejectedValueOnce(
      new Error('Unable to load SFZ: piano.sfz (HTTP 404)')
    );
    render(<SFZSongForm />);
    await screen.findByText(
      'Instrument selected. Preview skipped; renderer will handle loading.'
    );
  });

  it('shows success snackbar and clears status on completion', async () => {
    render(<SFZSongForm />);
    await screen.findByText('Change SFZ');
    listeners['basic_sfz_progress']?.({
      payload: '{"stage":"start","message":"working"}',
    });
    await screen.findByText('working');
    listeners['basic_sfz_progress']?.({
      payload: '{"stage":"done","message":"saved"}',
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('saved');
    expect(alert).toHaveClass('MuiAlert-standardSuccess');
    await waitFor(() => expect(screen.queryByText('working')).toBeNull());
  });

  it('shows error snackbar and clears status on failure', async () => {
    render(<SFZSongForm />);
    await screen.findByText('Change SFZ');
    listeners['basic_sfz_progress']?.({
      payload: '{"stage":"start","message":"working"}',
    });
    await screen.findByText('working');
    listeners['basic_sfz_progress']?.({
      payload: '{"stage":"error","message":"oops"}',
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('oops');
    expect(alert).toHaveClass('MuiAlert-standardError');
    await waitFor(() => expect(screen.queryByText('working')).toBeNull());
  });
});

