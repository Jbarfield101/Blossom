import { Box, Typography, Tooltip } from '@mui/material';
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
      return <Box sx={{ minHeight: 96, bgcolor: 'grey.50' }} />;
    }

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onDayClick(day, e);
      },
      [day, onDayClick]
    );

    return (
      <Box
        data-testid={`day-${day}`}
        onClick={handleClick}
        onDoubleClick={() => onPrefill(day)}
        onKeyDown={(e) => e.key === 'Enter' && handleClick(e)}
        tabIndex={0}
        role="gridcell"
        aria-label={`Day ${day}, ${events.length} events`}
        aria-selected={isSelected}
        aria-current={isToday ? 'date' : undefined}
        sx={{
          position: 'relative',
          minHeight: 96,
          p: 2,
          border: '1px solid',
          borderColor: isToday ? 'primary.light' : 'grey.200',
          bgcolor: isToday ? 'primary.light' : 'background.paper',
          cursor: 'pointer',
          '&:focus': {
            outline: 'none',
            boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}`,
          },
        }}
      >
        {holiday && (
          <Tooltip title={holiday}>
            <Box sx={{ position: 'absolute', top: 4, right: 4, fontSize: 12 }}>🎉</Box>
          </Tooltip>
        )}
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          {day}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {events.slice(0, 3).map((ev) => (
            <Box
              key={ev.id}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: statusColors[ev.status],
              }}
            />
          ))}
          {events.length > 3 && (
            <Tooltip title={events.slice(3).map((ev) => ev.title).join(', ')}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                +{events.length - 3}
              </Typography>
            </Tooltip>
          )}
        </Box>
      </Box>
    );
  }
);

export default CalendarDay;
