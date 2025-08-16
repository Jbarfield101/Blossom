import { beforeEach, describe, expect, it } from 'vitest';
import { useCalendar } from '../useCalendar';

describe('useCalendar store', () => {
  beforeEach(() => {
    useCalendar.setState({ events: [], selectedCountdownId: null, tagTotals: {} });
  });

  it('adds an event', () => {
    useCalendar.getState().addEvent({
      title: 'Test',
      date: '2024-01-01T09:00',
      end: '2024-01-01T10:00',
      tags: ['work'],
      status: 'scheduled',
      hasCountdown: false,
    });
    const state = useCalendar.getState();
    expect(state.events).toHaveLength(1);
    expect(state.events[0].title).toBe('Test');
  });

  it('updates an event', () => {
    useCalendar.getState().addEvent({
      title: 'Old',
      date: '2024-01-01T09:00',
      end: '2024-01-01T10:00',
      tags: [],
      status: 'scheduled',
      hasCountdown: false,
    });
    const id = useCalendar.getState().events[0].id;
    useCalendar.getState().updateEvent(id, { title: 'New' });
    expect(useCalendar.getState().events[0].title).toBe('New');
  });

  it('rejects invalid updates', () => {
    useCalendar.getState().addEvent({
      title: 'Original',
      date: '2024-01-01T09:00',
      end: '2024-01-01T10:00',
      tags: [],
      status: 'scheduled',
      hasCountdown: false,
    });
    const id = useCalendar.getState().events[0].id;
    useCalendar.getState().updateEvent(id, { end: '2024-01-01T08:00' });
    const event = useCalendar.getState().events[0];
    expect(event.end).toBe('2024-01-01T10:00');
  });

  it('removes an event', () => {
    useCalendar.getState().addEvent({
      title: 'Remove',
      date: '2024-01-01T09:00',
      end: '2024-01-01T10:00',
      tags: [],
      status: 'scheduled',
      hasCountdown: false,
    });
    const id = useCalendar.getState().events[0].id;
    useCalendar.getState().removeEvent(id);
    expect(useCalendar.getState().events).toHaveLength(0);
  });

  it('calculates tag totals', () => {
    const add = useCalendar.getState().addEvent;
    add({
      title: 'A',
      date: '2024-01-01T09:00',
      end: '2024-01-01T10:00',
      tags: ['work'],
      status: 'completed',
      hasCountdown: false,
    });
    add({
      title: 'B',
      date: '2024-01-02T09:00',
      end: '2024-01-02T09:30',
      tags: ['work', 'play'],
      status: 'scheduled',
      hasCountdown: false,
    });
    const hour = 60 * 60 * 1000;
    const totals = useCalendar.getState().tagTotals;
    expect(totals.work).toBe(1.5 * hour);
    expect(totals.play).toBe(0.5 * hour);
  });

  it('rejects events where end is not after start', () => {
    useCalendar.getState().addEvent({
      title: 'Bad',
      date: '2024-01-01T09:00',
      end: '2024-01-01T09:00',
      tags: [],
      status: 'scheduled',
      hasCountdown: false,
    });
    expect(useCalendar.getState().events).toHaveLength(0);
  });
});

