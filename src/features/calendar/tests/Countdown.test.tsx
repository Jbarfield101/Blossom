import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import Countdown from '../../../components/Countdown';

describe('Countdown', () => {
  it('counts down until due', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00'));
    const target = '2024-01-01T00:00:03';
    render(<Countdown target={target} />);
    expect(screen.getByText('0d 0h 0m 3s')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText('Due')).toBeInTheDocument();
    vi.useRealTimers();
  });
});

