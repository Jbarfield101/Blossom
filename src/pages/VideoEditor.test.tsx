import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import VideoEditor from './VideoEditor';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { MemoryRouter } from 'react-router-dom';

type Mock = ReturnType<typeof vi.fn>;
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), convertFileSrc: vi.fn() }));

describe('VideoEditor', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders preview video when outputPath is set', async () => {
    (open as Mock).mockResolvedValueOnce('input.mp4');
    (open as Mock).mockResolvedValueOnce('/out');
    (invoke as Mock).mockResolvedValue('/out/looped.mp4');
    (convertFileSrc as Mock).mockImplementation((p: string) => `converted:${p}`);

    const { container } = render(
      <MemoryRouter>
        <VideoEditor />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /select input video/i }));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /choose output folder/i }));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: /create loop/i }));

    await waitFor(() => {
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video?.getAttribute('src')).toBe('converted:/out/looped.mp4');
    });
    expect(convertFileSrc).toHaveBeenCalledWith('/out/looped.mp4');
  });
});
