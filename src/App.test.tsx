import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

vi.mock('./components/TopBar', () => ({ default: () => <div /> }));
vi.mock('./components/CreateUserDialog', () => ({ default: () => <div /> }));
vi.mock('./pages/Home', () => ({ default: () => <div /> }));
vi.mock('./pages/Objects', () => ({ default: () => <div /> }));
vi.mock('./pages/Blender', () => ({ default: () => <div /> }));
vi.mock('./pages/Music', () => ({ default: () => <div /> }));
vi.mock('./pages/Calendar', () => ({ default: () => <div /> }));
vi.mock('./pages/Comfy', () => ({ default: () => <div /> }));
vi.mock('./pages/Assistant', () => ({ default: () => <div /> }));
vi.mock('./pages/GeneralChat', () => ({ default: () => <div /> }));
vi.mock('./pages/Seo', () => ({ default: () => <div /> }));
vi.mock('./pages/WorldBuilder', () => ({ default: () => <div /> }));
vi.mock('./pages/NPCMaker', () => ({ default: () => <div /> }));
vi.mock('./pages/NPCList', () => ({ default: () => <div /> }));
vi.mock('./pages/NPCDetail', () => ({ default: () => <div /> }));
vi.mock('./pages/Laser', () => ({ default: () => <div /> }));
vi.mock('./pages/Lofi', () => ({ default: () => <div /> }));
vi.mock('./pages/NotFound', () => ({ default: () => <div /> }));
vi.mock('./pages/DND', () => ({ default: () => <div /> }));
vi.mock('./pages/Stocks', () => ({ default: () => <div /> }));
vi.mock('./pages/Shorts', () => ({ default: () => <div /> }));
vi.mock('./pages/Chores', () => ({ default: () => <div /> }));
vi.mock('./pages/User', () => ({ default: () => <div /> }));
vi.mock('./pages/SystemInfo', () => ({ default: () => <div /> }));
vi.mock('./pages/Fusion', () => ({ default: () => <div /> }));
vi.mock('./pages/Transcription', () => ({ default: () => <div /> }));
vi.mock('./pages/Construction', () => ({ default: () => <div /> }));
vi.mock('./pages/Simulation', () => ({ default: () => <div /> }));
vi.mock('./pages/BigBrother', () => ({ default: () => <div /> }));
vi.mock('./pages/Voices', () => ({ default: () => <div /> }));
vi.mock('./features/theme/ThemeContext', () => ({
  useTheme: () => ({ theme: 'retro', setTheme: vi.fn() }),
}));
vi.mock('./features/users/useUsers', () => ({
  useUsers: (selector: any) =>
    selector({
      users: { '1': {} },
      currentUserId: '1',
      switchUser: vi.fn(),
    }),
}));
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: (p: string) => `tauri://${p}`,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('App RetroTV', () => {
  it('does not render RetroTV on /comfy route', () => {
    const { queryByText } = render(
      <MemoryRouter initialEntries={['/comfy']}>
        <App />
      </MemoryRouter>
    );
    expect(queryByText('NO SIGNAL')).toBeNull();
  });

  it('renders RetroTV on non-comfy route', () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(getByText('NO SIGNAL')).not.toBeNull();
  });
});
