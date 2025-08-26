import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import React, { useCallback, useState } from 'react';
import { useStatusColors } from '../features/calendar/statusColors';
import type { CalendarEvent } from '../features/calendar/types';
import HistoryDialog from './HistoryDialog';

interface Props {
  day: number | null;
  month: number;
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
    month,
    events,
    onDayClick,
    onPrefill,
    isToday,
    isFocused,
    isSelected,
    holiday,
  }: Props) => {
    const statusColors = useStatusColors();
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyEvents, setHistoryEvents] = useState<
      {
        year: number;
        text: string;
        pages?: { content_urls?: { desktop?: { page?: string } } }[];
      }[]
    >([]);
    if (!day) {
      return <Box sx={{ minHeight: 96, bgcolor: 'grey.50' }} />;
    }

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onDayClick(day, e);
      },
      [day, onDayClick]
    );

    const handleAdd = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onPrefill(day);
        onDayClick(day, e as unknown as React.MouseEvent<HTMLDivElement>);
      },
      [day, onDayClick, onPrefill]
    );

    const handleHistory = useCallback(
      async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        try {
          const res = await fetch(
            `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${month}/${day}`,
            { headers: { 'User-Agent': 'Blossom' } }
          );
          const data = await res.json();
          setHistoryEvents(data.events || []);
        } catch {
          setHistoryEvents([]);
        }
        setHistoryOpen(true);
      },
      [day, month]
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
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            display: 'flex',
            gap: 0.5,
          }}
        >
          <IconButton
            size="small"
            aria-label={`Add event for day ${day}`}
            onClick={handleAdd}
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label={`Show history for day ${day}`}
            onClick={handleHistory}
          >
            <HistoryIcon fontSize="small" />
          </IconButton>
          {holiday && (
            <Tooltip title={holiday}>
              <Box sx={{ fontSize: 12 }}>🎉</Box>
            </Tooltip>
          )}
        </Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          {day}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {events.slice(0, 3).map((ev) => (
            <Box
              key={ev.id}
              sx={{
                borderLeft: `3px solid ${statusColors[ev.status]}`,
                pl: 0.5,
              }}
            >
              <Typography sx={{ fontSize: 11 }}>
                {ev.title.length > 10 ? `${ev.title.slice(0, 10)}…` : ev.title}
              </Typography>
            </Box>
          ))}
          {events.length > 3 && (
            <Tooltip title={events.slice(3).map((ev) => ev.title).join(', ')}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                +{events.length - 3}
              </Typography>
            </Tooltip>
          )}
        </Box>
        <HistoryDialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          events={historyEvents}
        />
      </Box>
    );
  }
);

export default CalendarDay;
