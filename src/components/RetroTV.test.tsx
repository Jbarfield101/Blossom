import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import RetroTV from './RetroTV';

vi.mock('../features/theme/ThemeContext', () => ({
  useTheme: () => ({ theme: 'retro' }),
}));
vi.mock('../features/users/useUsers', () => ({
  useUsers: (selector: any) =>
    selector({
      currentUserId: '1',
      users: {
        '1': { retroTvMedia: { path: '/tmp/video.mp4', width: 640, height: 480 } },
      },
    }),
}));
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: (p: string) => `tauri://${p}`,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RetroTV', () => {
  it('renders video when media is present', () => {
    const { container } = render(<RetroTV />);
    expect(container.querySelector('video')).not.toBeNull();
  });
});
