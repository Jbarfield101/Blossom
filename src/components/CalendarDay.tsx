import React, { useCallback } from 'react';
import { statusColors } from '../features/calendar/statusColors';
import type { CalendarEvent } from '../features/calendar/types';

interface Props {
  day: number | null;
  events: CalendarEvent[];
  onDayClick: (day: number, e: React.MouseEvent<HTMLDivElement>) => void;
  onPrefill: (day: number) => void;
  isToday: boolean;
  isFocused: boolean;
  isSelected: boolean;
  holiday?: string | null;
}

const CalendarDay = React.memo(
  ({
    day,
    events,
    onDayClick,
    onPrefill,
    isToday,
    isFocused,
    isSelected,
    holiday,
  }: Props) => {
    if (!day) {
      return <div className="min-h-24 bg-gray-50" />;
    }

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onDayClick(day, e);
      },
      [day, onDayClick]
    );

    return (
      <div
        data-testid={`day-${day}`}
        className={`relative min-h-24 p-2 border border-gray-200 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
        } ${isFocused ? 'ring-2 ring-blue-500' : ''}`}
        onClick={handleClick}
        onDoubleClick={() => onPrefill(day)}
        onKeyDown={(e) => e.key === 'Enter' && handleClick(e)}
        tabIndex={0}
        role="gridcell"
        aria-label={`Day ${day}, ${events.length} events`}
        aria-selected={isSelected}
        aria-current={isToday ? 'date' : undefined}
      >
        {holiday && <span className="absolute top-1 right-1 text-xs">🎉</span>}
        <div className="font-semibold text-gray-900 mb-1">{day}</div>
        <div className="flex gap-1 flex-wrap">
          {events.slice(0, 3).map((ev) => (
            <span
              key={ev.id}
              className={`w-2 h-2 rounded-full ${statusColors[ev.status]}`}
            />
          ))}
          {events.length > 3 && (
            <span className="text-[10px] text-gray-500">+{events.length - 3}</span>
          )}
        </div>
      </div>
    );
  }
);

export default CalendarDay;
