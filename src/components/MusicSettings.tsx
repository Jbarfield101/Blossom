import { Box, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import { useMusicSettings } from '../stores/musicSettings';

export default function MusicSettings() {
  const model = useMusicSettings((s) => s.model);
  const setModel = useMusicSettings((s) => s.setModel);
  const diffusion = useMusicSettings((s) => s.diffusion);
  const setDiffusion = useMusicSettings((s) => s.setDiffusion);
  const sampleRate = useMusicSettings((s) => s.sampleRate);
  const setSampleRate = useMusicSettings((s) => s.setSampleRate);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Settings</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl fullWidth>
          <InputLabel id="model">Default Model</InputLabel>
          <Select labelId="model" label="Default Model" value={model} onChange={(e) => setModel(e.target.value as any)}>
            <MenuItem value="musicgen-small">MusicGen small</MenuItem>
            <MenuItem value="musicgen-medium">MusicGen medium</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel id="diffusion">Diffusion</InputLabel>
          <Select labelId="diffusion" label="Diffusion" value={diffusion} onChange={(e) => setDiffusion(e.target.value as any)}>
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="latent-spec">Latent (spec)</MenuItem>
            <MenuItem value="ddim">DDIM</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel id="sr">Sample Rate</InputLabel>
          <Select labelId="sr" label="Sample Rate" value={sampleRate} onChange={(e) => setSampleRate(Number(e.target.value) as any)}>
            <MenuItem value={32000}>32000 Hz</MenuItem>
            <MenuItem value={44100}>44100 Hz</MenuItem>
            <MenuItem value={48000}>48000 Hz</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Box>
  );
}

