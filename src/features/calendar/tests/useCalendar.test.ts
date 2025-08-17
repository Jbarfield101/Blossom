import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import TagStats from '../../../components/TagStats';
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

  it('rejects invalid additions', () => {
    const add = useCalendar.getState().addEvent;
    add({
      title: '',
      date: '2024-01-01T09:00',
      end: '2024-01-01T10:00',
      tags: [],
      status: 'scheduled',
      hasCountdown: false,
    });
    add({
      title: 'Bad date',
      date: 'not-a-date',
      end: '2024-01-01T10:00',
      tags: [],
      status: 'scheduled',
      hasCountdown: false,
    });
    add({
      title: 'Bad end',
      date: '2024-01-01T09:00',
      end: 'nope',
      tags: [],
      status: 'scheduled',
      hasCountdown: false,
    });
    expect(useCalendar.getState().events).toHaveLength(0);
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
    useCalendar.getState().updateEvent(id, { date: 'invalid' });
    useCalendar.getState().updateEvent(id, { title: '' });
    const event = useCalendar.getState().events[0];
    expect(event).toMatchObject({
      title: 'Original',
      date: '2024-01-01T09:00',
      end: '2024-01-01T10:00',
    });
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

  it('sorts events after adding', () => {
    const add = useCalendar.getState().addEvent;
    add({
      title: 'B',
      date: '2024-01-02T09:00',
      end: '2024-01-02T10:00',
      tags: [],
      status: 'scheduled',
      hasCountdown: false,
    });
    add({
      title: 'A',
      date: '2024-01-01T09:00',
      end: '2024-01-01T10:00',
      tags: [],
      status: 'scheduled',
      hasCountdown: false,
    });
    const titles = useCalendar.getState().events.map((e) => e.title);
    expect(titles).toEqual(['A', 'B']);
  });

  it('sorts events after updating', () => {
    const add = useCalendar.getState().addEvent;
    add({
      title: 'A',
      date: '2024-01-02T09:00',
      end: '2024-01-02T10:00',
      tags: [],
      status: 'scheduled',
      hasCountdown: false,
    });
    add({
      title: 'B',
      date: '2024-01-03T09:00',
      end: '2024-01-03T10:00',
      tags: [],
      status: 'scheduled',
      hasCountdown: false,
    });
    const id = useCalendar.getState().events[1].id;
    useCalendar.getState().updateEvent(id, {
      date: '2024-01-01T09:00',
      end: '2024-01-01T10:00',
    });
    const titles = useCalendar.getState().events.map((e) => e.title);
    expect(titles).toEqual(['B', 'A']);
  });

  it('renders tag stats sorted by duration', () => {
    useCalendar.setState({ tagTotals: { short: 1, long: 2 } });
    render(createElement(TagStats));
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent(/^long:/);
    expect(items[1]).toHaveTextContent(/^short:/);
  });
});

