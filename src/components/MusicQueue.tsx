import { Box, IconButton, LinearProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import ReplayIcon from '@mui/icons-material/Replay';
import { useMusicJobs } from '../stores/musicJobs';
import { cancelMusicJob } from '../utils/musicGen';

export default function MusicQueue() {
  const listAll = useMusicJobs((s) => s.list)();
  const update = useMusicJobs((s) => s.update);
  const queue = listAll.filter((j) => j.status === 'pending' || j.status === 'in_progress');

  const onCancel = async (id: string) => {
    await cancelMusicJob(id);
    update(id, { status: 'canceled' });
  };
  const onRetry = (id: string) =>
    update(id, { status: 'pending', progress: 0, error: undefined, startAt: Date.now() });

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Render Queue</Typography>
      {!queue.length ? (
        <Typography>No pending jobs.</Typography>
      ) : (
        <Table size="small" aria-label="queue">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {queue.map((j) => {
              const progress = j.progress ?? 0;
              const elapsed = j.startAt ? Date.now() - j.startAt : 0;
              const eta = progress > 0 ? (elapsed * (100 - progress)) / progress : null;
              return (
                <TableRow key={j.id} hover>
                  <TableCell>{j.title}</TableCell>
                  <TableCell>{j.status}</TableCell>
                  <TableCell style={{ width: 200 }}>
                    {typeof j.progress === 'number' ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LinearProgress variant="determinate" value={j.progress} sx={{ flex: 1 }} />
                        <Typography variant="caption">{j.progress}%</Typography>
                        {eta !== null && isFinite(eta) && (
                          <Typography variant="caption">{`${Math.round(eta / 1000)}s`}</Typography>
                        )}
                      </Stack>
                    ) : (
                      <LinearProgress />
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <IconButton aria-label="cancel" onClick={() => onCancel(j.id)}><CancelIcon /></IconButton>
                      <IconButton aria-label="retry" onClick={() => onRetry(j.id)}><ReplayIcon /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
        Note: Cancel stops UI updates, but running generation may still finish; we guard against overwriting canceled jobs.
      </Typography>
    </Box>
  );
}
