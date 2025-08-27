import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { StrictMode } from 'react';
import RetroTV from './RetroTV';

const clearRetroTvMedia = vi.fn();
vi.mock('../features/theme/ThemeContext', () => ({
  useTheme: () => ({ theme: 'retro' }),
}));
vi.mock('../features/users/useUsers', () => ({
  useUsers: (selector: any) =>
    selector({
      currentUserId: '1',
      users: { '1': { retroTvMedia: null } },
      setRetroTvMedia: vi.fn(),
      clearRetroTvMedia,
    }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RetroTV', () => {
  it('clears media only on unmount', () => {
    const { unmount } = render(
      <StrictMode>
        <RetroTV />
      </StrictMode>
    );
    expect(clearRetroTvMedia).not.toHaveBeenCalled();
    unmount();
    expect(clearRetroTvMedia).toHaveBeenCalledTimes(1);
  });
});
