import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Calendar from './Calendar';
import { useCalendar } from '../features/calendar/useCalendar';

describe('Calendar time validation', () => {
  beforeEach(() => {
    useCalendar.setState({ events: [], selectedCountdownId: null, tagTotals: {} });
  });

  afterEach(() => {
    cleanup();
    useCalendar.setState({ events: [], selectedCountdownId: null, tagTotals: {} });
  });

  it('allows adding events with valid times', () => {
    render(<Calendar />);
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Meeting' },
    });
    fireEvent.change(screen.getByTestId('date-input'), {
      target: { value: '2024-01-01T09:00' },
    });
    fireEvent.change(screen.getByTestId('end-input'), {
      target: { value: '2024-01-01T10:00' },
    });
    const addButton = screen.getByTestId('add-button');
    expect(addButton).not.toBeDisabled();
    expect(screen.queryByTestId('time-error')).toBeNull();
    fireEvent.click(addButton);
    expect(
      useCalendar.getState().events.some((e) => e.title === 'Meeting')
    ).toBe(true);
  });

  it('disables add when end is before start', () => {
    render(<Calendar />);
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Meeting' },
    });
    fireEvent.change(screen.getByTestId('date-input'), {
      target: { value: '2024-01-01T10:00' },
    });
    fireEvent.change(screen.getByTestId('end-input'), {
      target: { value: '2024-01-01T09:00' },
    });
    const addButton = screen.getByTestId('add-button');
    expect(addButton).toBeDisabled();
    expect(screen.getByTestId('time-error')).toBeInTheDocument();
    fireEvent.click(addButton);
    expect(
      useCalendar.getState().events.some((e) => e.title === 'Meeting')
    ).toBe(false);
  });

  it('supports basic keyboard navigation', () => {
    render(<Calendar />);
    const firstDay = screen.getByTestId('day-1');
    fireEvent.click(firstDay);
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByTestId('day-2')).toHaveFocus();
  });
});
