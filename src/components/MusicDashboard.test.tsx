import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MusicDashboard from './MusicDashboard';

describe('MusicDashboard', () => {
  it('renders placeholder message', () => {
    render(<MusicDashboard />);
    expect(screen.getByText(/Project Dashboard/)).toBeInTheDocument();
  });
});
