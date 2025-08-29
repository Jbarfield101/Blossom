import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SFZSongForm from './SFZSongForm';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { loadSfz } from '../utils/sfzLoader';

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

const enqueueTask = vi.fn();
vi.mock('../store/tasks', () => ({
  useTasks: () => ({ enqueueTask }),
}));

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
    await screen.findByText('Change SFZ');
    const lofi = screen.getByLabelText('Lofi Filter');
    expect(lofi).not.toBeChecked();
  });

  it('enqueues GenerateSong with default lofi filter', async () => {
    (openDialog as any).mockResolvedValueOnce('/tmp/out');

    render(<SFZSongForm />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Choose Output Folder'));
    await screen.findByText('Output: /tmp/out');
    await screen.findByText('Change SFZ');

    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => expect(enqueueTask).toHaveBeenCalled());
    const [, args] = enqueueTask.mock.calls[0];
    expect(args.id).toBe('GenerateSong');
    expect(args.spec.instruments).toEqual([]);
    expect(args.spec.ambience).toEqual([]);
    expect(args.spec.bpm).toBe(64);
    expect(args.spec.lofi_filter).toBe(false);
    expect(typeof args.spec.seed).toBe('number');
    expect(args.spec.seed).toBeLessThan(2 ** 32);
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
    await waitFor(() => expect(enqueueTask).toHaveBeenCalled());
    const [, args] = enqueueTask.mock.calls[0];
    expect(args.spec.lofi_filter).toBe(true);
  });

  it('prefills output directory from config', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({ sfz_out_dir: '/saved/out' });
    render(<SFZSongForm />);
    await screen.findByText('Change SFZ');
    expect(screen.getByText('Output: /saved/out')).toBeInTheDocument();
  });

  it('prefills output directory from localStorage when config missing', async () => {
    localStorage.setItem('sfzOutDir', '/stored/out');
    render(<SFZSongForm />);
    await screen.findByText('Change SFZ');
    expect(screen.getByText('Output: /stored/out')).toBeInTheDocument();
  });

  it('persists chosen folder', async () => {
    (openDialog as any).mockResolvedValueOnce('/tmp/out');
    render(<SFZSongForm />);
    await screen.findByText('Change SFZ');
    fireEvent.click(screen.getByText('Choose Output Folder'));
    await screen.findByText('Output: /tmp/out');
    expect(localStorage.getItem('sfzOutDir')).toBe('/tmp/out');
    expect(vi.mocked(invoke).mock.calls).toContainEqual([
      'save_paths',
      { sfz_out_dir: '/tmp/out' },
    ]);
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
    await waitFor(() => expect(enqueueTask).toHaveBeenCalled());
    const [, args] = enqueueTask.mock.calls[0];
    expect(args.spec.sfz_instrument).toBe('/tmp/piano.sfz');
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
    await screen.findByText('saved');
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
    await screen.findByText('oops');
    await waitFor(() => expect(screen.queryByText('working')).toBeNull());
  });
});

