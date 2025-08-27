import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock non-essential components and pages to isolate RetroTV behavior
vi.mock('./components/TopBar', () => ({ default: () => <div /> }));
vi.mock('./components/CreateUserDialog', () => ({ default: () => <div /> }));
vi.mock('./pages/Comfy', () => ({ default: () => <div>Comfy</div> }));
vi.mock('./pages/Home', () => ({ default: () => <div>Home</div> }));

// Provide minimal implementations for hooks used by RetroTV/App
vi.mock('./features/theme/ThemeContext', () => ({
  useTheme: () => ({ theme: 'retro' })
}));

vi.mock('./features/users/useUsers', () => ({
  useUsers: (selector: any) =>
    selector({ users: {}, currentUserId: null, switchUser: vi.fn() })
}));

import App from './App';

afterEach(() => {
  cleanup();
});

describe('App RetroTV overlay', () => {
  it('shows RetroTV on non-Comfy routes', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/' }]}> 
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('NO SIGNAL')).toBeInTheDocument();
  });

  it('hides RetroTV on the Comfy route', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/comfy' }]}> 
        <App />
      </MemoryRouter>
    );
    expect(screen.queryByText('NO SIGNAL')).toBeNull();
  });
});

