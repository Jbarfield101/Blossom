import { render, screen, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import Home from './Home';
import { useCalendar } from '../features/calendar/useCalendar';
import { MemoryRouter } from 'react-router-dom';

const widgets = { homeChat: false, systemInfo: false, tasks: false };

vi.mock('../features/settings/useSettings', () => ({
  useSettings: () => ({ widgets }),
}));

vi.mock('../features/theme/ThemeContext', () => ({
  useTheme: () => ({ theme: 'default' }),
}));

vi.mock('../components/HomeChat', () => ({
  default: () => <div>HomeChatWidget</div>,
}));

vi.mock('../components/SystemInfoWidget', () => ({
  default: () => <div>SystemInfoWidget</div>,
}));

vi.mock('../components/FeatureNav', () => ({
  default: () => <div>FeatureNav</div>,
}));

vi.mock('../components/HoverCircle', () => ({
  default: () => <div>HoverCircle</div>,
}));

vi.mock('../components/VersionBadge', () => ({
  default: () => <div>VersionBadge</div>,
}));

describe('Home widgets', () => {
  beforeEach(() => {
    widgets.homeChat = false;
    widgets.systemInfo = false;
    widgets.tasks = false;
    useCalendar.setState({ events: [], selectedCountdownId: null, tagTotals: {} });
  });

  afterEach(() => {
    cleanup();
    useCalendar.setState({ events: [], selectedCountdownId: null, tagTotals: {} });
  });

  it('hides all widgets when flags are false', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.queryByText('HomeChatWidget')).toBeNull();
    expect(screen.queryByText('SystemInfoWidget')).toBeNull();
    expect(screen.queryByText(/No tasks today!/i)).toBeNull();
  });

  it('shows HomeChat when enabled', () => {
    widgets.homeChat = true;
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText('HomeChatWidget')).toBeInTheDocument();
  });

  it('shows SystemInfoWidget when enabled', () => {
    widgets.systemInfo = true;
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText('SystemInfoWidget')).toBeInTheDocument();
  });

  it('shows TasksWidget and empty message when enabled without events', () => {
    widgets.tasks = true;
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText('No tasks today!')).toBeInTheDocument();
  });
});

