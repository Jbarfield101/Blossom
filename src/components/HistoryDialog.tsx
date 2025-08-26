import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  Link,
  Typography,
} from '@mui/material';

interface EventItem {
  year: number;
  text: string;
  pages?: { content_urls?: { desktop?: { page?: string } } }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  events: EventItem[];
}

export default function HistoryDialog({ open, onClose, events }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>On This Day</DialogTitle>
      <DialogContent>
        {events.length === 0 ? (
          <Typography>No events found.</Typography>
        ) : (
          <List>
            {events.map((ev, idx) => (
              <ListItem key={idx} disableGutters>
                <Link
                  href={ev.pages?.[0]?.content_urls?.desktop?.page}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                >
                  {ev.year}: {ev.text}
                </Link>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}

