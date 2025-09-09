import { Box, Typography } from '@mui/material';

export default function MusicQueue() {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Render Queue</Typography>
      <Typography>No pending jobs.</Typography>
    </Box>
  );
}
