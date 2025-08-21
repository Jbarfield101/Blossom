import { List, ListItem, Typography, Paper } from '@mui/material';
import { useCalendar } from '../features/calendar/useCalendar';

export default function TagStats() {
  const { tagTotals } = useCalendar();
  const entries = Object.entries(tagTotals).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  return (
    <Paper sx={{ p: 3, mt: 6 }}>
      <Typography variant="h6" gutterBottom>
        Tag Stats
      </Typography>
      <List dense sx={{ p: 0 }}>
        {entries.map(([tag, ms]) => (
          <ListItem key={tag} sx={{ py: 0 }}>
            <Typography variant="body2" color="text.secondary">
              {tag}: {(ms / (1000 * 60 * 60)).toFixed(2)}h
            </Typography>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
