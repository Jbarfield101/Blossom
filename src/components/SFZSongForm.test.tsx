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
  });

  afterEach(() => {
    cleanup();
  });

  it('renders title, output folder, and sfz selector', () => {
    render(<SFZSongForm />);
    expect(screen.getByPlaceholderText('Title')).toBeInTheDocument();
    expect(screen.getByText('Choose Output Folder')).toBeInTheDocument();
    expect(screen.getByText('Pick SFZ Instrument')).toBeInTheDocument();
  });

  it('enqueues GenerateSong with empty arrays', async () => {
    (openDialog as any)
      .mockResolvedValueOnce('/tmp/out')
      .mockResolvedValueOnce('/tmp/piano.sfz');

    render(<SFZSongForm />);
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Choose Output Folder'));
    await screen.findByText('Output: /tmp/out');
    fireEvent.click(screen.getByText('Pick SFZ Instrument'));
    await screen.findByText('Change SFZ');

    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => expect(enqueueTask).toHaveBeenCalled());
    const [, args] = enqueueTask.mock.calls[0];
    expect(args.id).toBe('GenerateSong');
    expect(args.spec.instruments).toEqual([]);
    expect(args.spec.ambience).toEqual([]);
  });
});

