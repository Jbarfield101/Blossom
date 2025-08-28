import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SFZSongForm from './SFZSongForm';
import { open as openDialog } from '@tauri-apps/plugin-dialog';

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/api/path', () => ({ resolveResource: (p: string) => Promise.resolve(p) }));

const enqueueTask = vi.fn();
vi.mock('../store/tasks', () => ({
  useTasks: () => ({ enqueueTask }),
}));

describe('SFZSongForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders form with lofi filter off', async () => {
    render(<SFZSongForm />);
    expect(screen.getByPlaceholderText('Title')).toBeInTheDocument();
    expect(screen.getByText('Choose Output Folder')).toBeInTheDocument();
    await screen.findByText('Change SFZ');
    const lofi = screen.getByLabelText('Lofi Filter');
    expect(lofi).not.toBeChecked();
  });

  it('enqueues GenerateSong with default lofi filter', async () => {
    (openDialog as any).mockResolvedValueOnce('/tmp/out');

    render(<SFZSongForm />);
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'Test' } });
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
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Choose Output Folder'));
    await screen.findByText('Output: /tmp/out');
    await screen.findByText('Change SFZ');
    fireEvent.click(screen.getByLabelText('Lofi Filter'));

    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => expect(enqueueTask).toHaveBeenCalled());
    const [, args] = enqueueTask.mock.calls[0];
    expect(args.spec.lofi_filter).toBe(true);
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
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Choose Output Folder'));
    await screen.findByText('Output: /tmp/out');
    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => expect(enqueueTask).toHaveBeenCalled());
    const [, args] = enqueueTask.mock.calls[0];
    expect(args.spec.sfz_instrument).toBe('/tmp/piano.sfz');
  });
});

