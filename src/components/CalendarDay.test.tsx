import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CalendarDay from './CalendarDay';
import type { CalendarEvent } from '../features/calendar/types';

describe('CalendarDay', () => {
  it('adds event via quick add button', () => {
    const onDayClick = vi.fn();
    const onPrefill = vi.fn();
    render(
      <CalendarDay
        day={1}
        month={1}
        events={[] as CalendarEvent[]}
        onDayClick={onDayClick}
        onPrefill={onPrefill}
        isToday={false}
        isFocused={false}
        isSelected={false}
      />
    );
    const btn = screen.getByRole('button', { name: /add event/i });
    fireEvent.click(btn);
    expect(onPrefill).toHaveBeenCalledWith(1);
    expect(onDayClick).toHaveBeenCalledTimes(1);
    expect(onDayClick.mock.calls[0][0]).toBe(1);
  });

  it('shows history events when history button is clicked', async () => {
    const onDayClick = vi.fn();
    const onPrefill = vi.fn();
    const mockFetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          events: [
            {
              year: 1066,
              text: 'Battle of Hastings',
              pages: [
                {
                  content_urls: {
                    desktop: {
                      page: 'https://en.wikipedia.org/wiki/Battle_of_Hastings',
                    },
                  },
                },
              ],
            },
          ],
        }),
    });
    // @ts-ignore
    global.fetch = mockFetch;

    render(
      <CalendarDay
        day={7}
        month={10}
        events={[] as CalendarEvent[]}
        onDayClick={onDayClick}
        onPrefill={onPrefill}
        isToday={false}
        isFocused={false}
        isSelected={false}
      />
    );
    const historyBtn = screen.getByRole('button', { name: /history for day 7/i });
    fireEvent.click(historyBtn);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/10/7',
      expect.any(Object)
    );
    await screen.findByText(/Battle of Hastings/i);
  });
});
