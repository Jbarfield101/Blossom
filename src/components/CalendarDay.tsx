import React, { useCallback } from 'react';
import type { CalendarEvent } from '../features/calendar/types';

interface Props {
  day: number | null;
  events: CalendarEvent[];
  onDayClick: (day: number) => void;
  isToday: boolean;
}

const CalendarDay = React.memo(({ day, events, onDayClick, isToday }: Props) => {
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
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      tabIndex={0}
      role="gridcell"
      aria-label={`Day ${day}, ${events.length} events`}
    >
      <div className="font-semibold text-gray-900 mb-1">{day}</div>
      {events.map((ev) => (
        <div key={ev.id} className="text-xs truncate">
          {ev.title}
        </div>
      ))}
    </div>
  );
});

export default CalendarDay;
