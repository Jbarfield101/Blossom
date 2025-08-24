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
});
