import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Calendar from './Calendar';
import { vi } from 'vitest';

const addEvent = vi.fn();

const holidayEvents = [
  {
    id: '1',
    title: "New Year's Day",
    date: new Date(new Date().getFullYear(), 0, 1).toISOString(),
    end: new Date(new Date().getFullYear(), 0, 1, 23, 59).toISOString(),
    tags: ['holiday'],
    status: 'scheduled',
    hasCountdown: false,
  },
  {
    id: '2',
    title: 'Independence Day',
    date: new Date(new Date().getFullYear(), 6, 4).toISOString(),
    end: new Date(new Date().getFullYear(), 6, 4, 23, 59).toISOString(),
    tags: ['holiday'],
    status: 'scheduled',
    hasCountdown: false,
  },
  {
    id: '3',
    title: 'Halloween',
    date: new Date(new Date().getFullYear(), 10, 31).toISOString(),
    end: new Date(new Date().getFullYear(), 10, 31, 23, 59).toISOString(),
    tags: ['holiday'],
    status: 'scheduled',
    hasCountdown: false,
  },
  {
    id: '4',
    title: 'Christmas Day',
    date: new Date(new Date().getFullYear(), 11, 25).toISOString(),
    end: new Date(new Date().getFullYear(), 11, 25, 23, 59).toISOString(),
    tags: ['holiday'],
    status: 'scheduled',
    hasCountdown: false,
  },
];

vi.mock('../features/calendar/useCalendar', () => ({
  useCalendar: () => ({
    events: holidayEvents,
    addEvent,
  }),
}));

describe('Calendar time validation', () => {
  beforeEach(() => {
    addEvent.mockClear();
  });

  it('allows adding event when end is after start', () => {
    render(<Calendar />);
    addEvent.mockClear();
    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: 'Meeting' },
    });
    fireEvent.change(screen.getByLabelText('start time'), {
      target: { value: '2025-05-16T09:00' },
    });
    fireEvent.change(screen.getByLabelText('end time'), {
      target: { value: '2025-05-16T10:00' },
    });

    const addButton = screen.getByText('Add');
    expect(addButton).not.toBeDisabled();
    fireEvent.click(addButton);

    expect(addEvent).toHaveBeenCalledWith({
      title: 'Meeting',
      date: '2025-05-16T09:00',
      end: '2025-05-16T10:00',
      tags: [],
      status: 'scheduled',
      hasCountdown: false,
    });
  });

  it('disables Add and shows error when end is before start', () => {
    render(<Calendar />);
    addEvent.mockClear();
    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: 'Meeting' },
    });
    fireEvent.change(screen.getByLabelText('start time'), {
      target: { value: '2025-05-16T10:00' },
    });
    fireEvent.change(screen.getByLabelText('end time'), {
      target: { value: '2025-05-16T09:00' },
    });

    const addButton = screen.getByText('Add');
    expect(addButton).toBeDisabled();
    expect(
      screen.getByText('End time must be after start time')
    ).toBeInTheDocument();
    fireEvent.click(addButton);
    expect(addEvent).not.toHaveBeenCalled();
  });
});
