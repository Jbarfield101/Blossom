import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WeekView from './WeekView';
import type { CalendarEvent } from '../features/calendar/types';

describe('WeekView', () => {
  const current = new Date('2024-05-15T12:00');

  it('includes events that overlap the week', () => {
    const events: CalendarEvent[] = [
      {
        id: '1',
        title: 'Weekend',
        date: '2024-05-11T23:00',
        end: '2024-05-12T01:00',
        tags: [],
        status: 'scheduled',
        hasCountdown: false,
      },
    ];

    render(<WeekView current={current} events={events} />);
    const sunday = screen.getByText('Sunday').parentElement!;
    expect(
      within(sunday).getByText('12:00 AM - 1:00 AM Weekend')
    ).toBeInTheDocument();
  });

  it('splits spanning events across days', () => {
    const events: CalendarEvent[] = [
      {
        id: '2',
        title: 'Overnight',
        date: '2024-05-13T23:00',
        end: '2024-05-14T01:00',
        tags: [],
        status: 'scheduled',
        hasCountdown: false,
      },
    ];

    render(<WeekView current={current} events={events} />);
    const monday = screen.getByText('Monday').parentElement!;
    const tuesday = screen.getByText('Tuesday').parentElement!;
    expect(
      within(monday).getByText('11:00 PM - 12:00 AM Overnight')
    ).toBeInTheDocument();
    expect(
      within(tuesday).getByText('12:00 AM - 1:00 AM Overnight')
    ).toBeInTheDocument();
  });
});
