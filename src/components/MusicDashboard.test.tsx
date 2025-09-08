import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MusicDashboard from './MusicDashboard';
import { convertFileSrc } from '@tauri-apps/api/core';

let list: any = () => [];
const remove = vi.fn();
const update = vi.fn();

vi.mock('../stores/musicJobs', () => ({
  useMusicJobs: (selector: any) => selector({ list, remove, update }),
}));

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((p: string) => p),
}));

describe('MusicDashboard', () => {
  it('plays audio when play button clicked', () => {
    list = () => [
      {
        id: '1',
        title: 'Song',
        prompt: '',
        createdAt: 0,
        status: 'completed',
        wavPath: 'file.wav',
      },
    ];
    const playSpy = vi.fn();
    class MockAudio {
      src: string;
      constructor(src: string) {
        this.src = src;
      }
      play = playSpy;
    }
    (globalThis as any).Audio = MockAudio as any;

    render(<MusicDashboard />);
    const [btn] = screen.getAllByRole('button', { name: 'play' });
    fireEvent.click(btn);
    expect(convertFileSrc).toHaveBeenCalledWith('file.wav');
    expect(playSpy).toHaveBeenCalled();
  });

  it('handles wavPathFinal for playback', () => {
    list = () => [
      {
        id: '1',
        title: 'Song',
        prompt: '',
        createdAt: 0,
        status: 'completed',
        wavPathFinal: 'final.wav',
      },
    ];
    const playSpy = vi.fn();
    class MockAudio {
      src: string;
      constructor(src: string) {
        this.src = src;
      }
      play = playSpy;
    }
    (globalThis as any).Audio = MockAudio as any;

    render(<MusicDashboard />);
    const [btn] = screen.getAllByRole('button', { name: 'play' });
    fireEvent.click(btn);
    expect(convertFileSrc).toHaveBeenCalledWith('final.wav');
    expect(playSpy).toHaveBeenCalled();
  });
});
