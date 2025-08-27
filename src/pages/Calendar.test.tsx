import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Calendar from './Calendar';
import { useCalendar } from '../features/calendar/useCalendar';

describe('Calendar quick add', () => {
  beforeEach(() => {
    useCalendar.setState({ events: [], selectedCountdownId: null, tagTotals: {} });
  });

  afterEach(() => {
    cleanup();
    useCalendar.setState({ events: [], selectedCountdownId: null, tagTotals: {} });
  });

  it('creates and edits events via popup with tags', () => {
    render(<Calendar />);
    const day1 = screen.getByTestId('day-1');
    fireEvent.click(day1);
    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: 'Meeting' },
    });
    fireEvent.change(screen.getByTestId('quick-time'), {
      target: { value: '10:00' },
    });
    fireEvent.change(screen.getByTestId('quick-duration'), {
      target: { value: '30' },
    });
    fireEvent.change(screen.getByPlaceholderText('Tags (comma separated)'), {
      target: { value: 'work' },
    });
    fireEvent.click(screen.getByText('Add'));
    let ev = useCalendar.getState().events.find((e) => e.title === 'Meeting');
    expect(ev?.tags).toEqual(['work']);

    fireEvent.click(day1);
    const editBtn = screen
      .getAllByText('Meeting')
      .find((el) => el.tagName.toLowerCase() === 'button')!;
    fireEvent.click(editBtn);
    const titleInput = screen.getByPlaceholderText('Title') as HTMLInputElement;
    expect(titleInput.value).toBe('Meeting');
    fireEvent.change(titleInput, { target: { value: 'Updated Meeting' } });
    const tagsInput = screen.getByPlaceholderText('Tags (comma separated)') as HTMLInputElement;
    fireEvent.change(tagsInput, { target: { value: 'updated' } });
    fireEvent.click(screen.getByText('Save'));
    ev = useCalendar.getState().events.find((e) => e.title === 'Updated Meeting');
    expect(ev?.tags).toEqual(['updated']);
  });

  it('deletes events from agenda list', () => {
    render(<Calendar />);
    const day1 = screen.getByTestId('day-1');
    fireEvent.click(day1);
    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: 'Meeting' },
    });
    fireEvent.click(screen.getByText('Add'));
    const deleteBtn = screen.getByLabelText('Delete event');
    fireEvent.click(deleteBtn);
    expect(useCalendar.getState().events.some((e) => e.title === 'Meeting')).toBe(
      false,
    );
  });

  it('switches between month, week, and agenda views', () => {
    render(<Calendar />);
    const day1 = screen.getByTestId('day-1');
    fireEvent.click(day1);
    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: 'Meeting' },
    });
    fireEvent.change(screen.getByTestId('quick-time'), {
      target: { value: '09:00' },
    });
    fireEvent.change(screen.getByTestId('quick-duration'), {
      target: { value: '60' },
    });
    fireEvent.click(screen.getByText('Add'));

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = '01';
    const startDate = new Date(`${yyyy}-${mm}-${dd}T09:00`);
    const endDate = new Date(startDate.getTime() + 60 * 60000);
    const startStr = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    const endStr = endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    const dateStr = startDate.toLocaleDateString('en-US');

    fireEvent.click(screen.getByText('week'));
    expect(screen.getByTestId('week-view')).toBeInTheDocument();

    fireEvent.click(screen.getByText('agenda'));
    expect(screen.getByTestId('agenda-view')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('agenda-view')).getByText(/Meeting/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('month'));
    expect(screen.getByTestId('day-1')).toBeInTheDocument();
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
});

describe('Calendar holidays', () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const mm = String(month + 1).padStart(2, '0');
  const originalFetch = global.fetch;

  beforeEach(() => {
    useCalendar.setState({ events: [], selectedCountdownId: null, tagTotals: {} });
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve([
            { date: `${year}-${mm}-01`, localName: 'Holiday One' },
            { date: `${year}-${mm}-02`, localName: 'Holiday Two' },
          ]),
      })
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    useCalendar.setState({ events: [], selectedCountdownId: null, tagTotals: {} });
    global.fetch = originalFetch;
  });

  it('displays holidays returned by the API', async () => {
    render(<Calendar />);
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/US`,
      ),
    );
    await waitFor(() => {
      expect(within(screen.getByTestId('day-1')).getByText('🎉')).toBeInTheDocument();
      expect(within(screen.getByTestId('day-2')).getByText('🎉')).toBeInTheDocument();
    });
  });
});
