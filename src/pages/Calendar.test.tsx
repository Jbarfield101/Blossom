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
    fireEvent.doubleClick(firstDay);
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByTestId('day-2')).toHaveFocus();
  });

  it('prefills times when double clicking a day', () => {
    render(<Calendar />);
    const day1 = screen.getByTestId('day-1');
    fireEvent.doubleClick(day1);
    const dateInput = screen.getByTestId('date-input') as HTMLInputElement;
    const endInput = screen.getByTestId('end-input') as HTMLInputElement;
    expect(dateInput.value).toMatch(/T09:00/);
    expect(endInput.value).toMatch(/T10:00/);
  });

  it('allows deleting events', () => {
    render(<Calendar />);
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Meeting' },
    });
    fireEvent.change(screen.getByTestId('date-input'), {
      target: { value: `${yyyy}-${mm}-01T09:00` },
    });
    fireEvent.change(screen.getByTestId('end-input'), {
      target: { value: `${yyyy}-${mm}-01T10:00` },
    });
    fireEvent.click(screen.getByTestId('add-button'));
    const day1 = screen.getByTestId('day-1');
    fireEvent.click(day1);
    fireEvent.click(screen.getByTestId('quick-add-overlay'));
    const deleteBtn = screen.getByLabelText('Delete event');
    fireEvent.click(deleteBtn);
    expect(
      useCalendar.getState().events.some((e) => e.title === 'Meeting')
    ).toBe(false);
  });
});
