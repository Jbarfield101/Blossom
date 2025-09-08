import { useMemo } from 'react';
import { Box, Button, IconButton, LinearProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';
import ReplayIcon from '@mui/icons-material/Replay';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMusicJobs } from '../stores/musicJobs';
import AudioPlayer from './AudioPlayer';
import { convertFileSrc } from '@tauri-apps/api/core';

export default function MusicDashboard() {
  const list = useMusicJobs((s) => s.list());
  const remove = useMusicJobs((s) => s.remove);
  const update = useMusicJobs((s) => s.update);

  const latestCompleted = useMemo(
    () =>
      list.find(
        (j) => j.status === 'completed' && (j.wavPathFinal || j.wavPath)
      ),
    [list]
  );

  const onRegenerate = (id: string) => {
    // Simple regeneration: reset status to pending (actual re-run can be added to re-use prompts)
    update(id, { status: 'pending', progress: 0 });
  };

  const onPlay = (path: string) => {
    const audio = new Audio(convertFileSrc(path));
    void audio.play();
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Project Dashboard</Typography>
      {!list.length ? (
        <Typography>No songs yet — compose your first track.</Typography>
      ) : (
        <Table size="small" aria-label="songs">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((j) => (
              <TableRow key={j.id} hover>
                <TableCell>{j.title}</TableCell>
                <TableCell>{new Date(j.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  {j.status === 'in_progress' && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LinearProgress sx={{ width: 120 }} />
                      <Typography variant="caption">Working…</Typography>
                    </Stack>
                  )}
                  {j.status !== 'in_progress' && <Typography variant="body2">{j.status}</Typography>}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {(j.wavPathFinal || j.wavPath) && (
                      <IconButton
                        aria-label="play"
                        onClick={() => onPlay(j.wavPathFinal ?? j.wavPath!)}
                      >
                        <PlayArrowIcon />
                      </IconButton>
                    )}
                    {(j.wavPathFinal || j.wavPath) && (
                      <Button
                        size="small"
                        component="a"
                        href={convertFileSrc(j.wavPathFinal ?? j.wavPath!)}
                        download
                        target="_blank"
                        rel="noreferrer"
                      >
                        <DownloadIcon fontSize="small" sx={{ mr: 0.5 }} /> Download
                      </Button>
                    )}
                    <IconButton aria-label="regenerate" onClick={() => onRegenerate(j.id)}><ReplayIcon /></IconButton>
                    <IconButton aria-label="delete" onClick={() => remove(j.id)}><DeleteIcon /></IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Quick preview for the most recent completed */}
      {latestCompleted && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1">Latest Preview</Typography>
          <AudioPlayer
            src={(latestCompleted.wavPathFinal ?? latestCompleted.wavPath)!}
          />
        </Box>
      )}
    </Box>
  );
}
