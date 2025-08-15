import React, { useCallback } from 'react';
import type { CalendarEvent } from '../features/calendar/types';
import { useCalendar } from '../features/calendar/useCalendar';

interface Props {
  day: number | null;
  events: CalendarEvent[];
  onDayClick: (day: number) => void;
  isToday: boolean;
}

const CalendarDay = React.memo(({ day, events, onDayClick, isToday }: Props) => {
  const removeEvent = useCalendar((s) => s.removeEvent);

  const handleClick = useCallback(() => {
    if (day) onDayClick(day);
  }, [day, onDayClick]);

  if (!day) {
    return <div className="min-h-24 bg-gray-50" />;
  }

  return (
    <div
      data-testid={`day-${day}`}
      className={`min-h-24 p-2 border border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors focus:outline-none ${
        isToday ? 'bg-blue-100 border-blue-300' : 'bg-white'
      }`}
      onClick={handleClick}
      onDoubleClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      tabIndex={0}
      role="gridcell"
      aria-label={`Day ${day}, ${events.length} events`}
    >
      <div className="font-semibold text-gray-900 mb-1">{day}</div>
      {events.map((ev) => (
        <div
          key={ev.id}
          className="text-xs truncate group flex items-center"
        >
          <span className="flex-1">{ev.title}</span>
          <button
            type="button"
            aria-label="Delete event"
            className="ml-1 text-red-500 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              removeEvent(ev.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
});

export default CalendarDay;
