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

  it('adds quick events with custom time and duration', () => {
    render(<Calendar />);
    const day1 = screen.getByTestId('day-1');
    fireEvent.click(day1);
    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: 'Quick Meeting' },
    });
    fireEvent.change(screen.getByTestId('quick-time'), {
      target: { value: '13:30' },
    });
    fireEvent.change(screen.getByTestId('quick-duration'), {
      target: { value: '90' },
    });
    fireEvent.click(screen.getByText('Add'));
    const ev = useCalendar
      .getState()
      .events.find((e) => e.title === 'Quick Meeting');
    expect(ev).toBeTruthy();
    expect(ev && ev.date).toContain('T13:30');
    expect(
      ev && (new Date(ev.end).getTime() - new Date(ev.date).getTime()) / 60000
    ).toBe(90);
  });

  it('closes quick add with Escape key and restores focus', () => {
    render(<Calendar />);
    const day1 = screen.getByTestId('day-1');
    fireEvent.click(day1);
    const titleInput = screen.getByPlaceholderText('Title');
    expect(titleInput).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Title')).toBeNull();
    expect(day1).toHaveFocus();
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

  it('allows editing events', () => {
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

    fireEvent.click(screen.getByTestId('day-1'));
    fireEvent.click(screen.getByTestId('quick-add-overlay'));
    fireEvent.click(screen.getByLabelText('Edit event'));

    const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
    expect(titleInput.value).toBe('Meeting');

    fireEvent.change(titleInput, { target: { value: 'Updated Meeting' } });
    fireEvent.click(screen.getByTestId('add-button'));

    expect(
      useCalendar.getState().events.some((e) => e.title === 'Updated Meeting')
    ).toBe(true);
  });

  it('switches between month, week, and agenda views', () => {
    render(<Calendar />);
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Meeting' },
    });
    fireEvent.change(screen.getByTestId('date-input'), {
      target: { value: `${yyyy}-${mm}-${dd}T09:00` },
    });
    fireEvent.change(screen.getByTestId('end-input'), {
      target: { value: `${yyyy}-${mm}-${dd}T10:00` },
    });
    fireEvent.click(screen.getByTestId('add-button'));

    fireEvent.click(screen.getByText('week'));
    expect(screen.getByTestId('week-view')).toBeInTheDocument();
    expect(screen.getByText('Meeting')).toBeInTheDocument();
    expect(screen.queryByTestId(`day-${parseInt(dd, 10)}`)).toBeNull();

    fireEvent.click(screen.getByText('agenda'));
    expect(screen.getByTestId('agenda-view')).toBeInTheDocument();
    expect(screen.getByText('Meeting')).toBeInTheDocument();

    fireEvent.click(screen.getByText('month'));
    expect(screen.getByTestId(`day-${parseInt(dd, 10)}`)).toBeInTheDocument();
  });
});
