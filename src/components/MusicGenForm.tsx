import { useMemo, useState } from 'react';
import { Box, Button, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMusicJobs } from '../stores/musicJobs';
import { cancelMusicJob, startMusicGenMelody, startMusicGenText } from '../utils/musicGen';
import { saveTempFile } from '../utils/files';

const GENRES = ['Lo-fi', 'Hip-hop', 'Ambient', 'Cinematic', 'Rock', 'Pop'];
const MOODS = ['Chill', 'Energetic', 'Dramatic', 'Happy', 'Sad'];
const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export default function MusicGenForm() {
  const addJob = useMusicJobs((s) => s.add);
  const updateJob = useMusicJobs((s) => s.update);
  const getJob = useMusicJobs((s) => s.get);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [tempo, setTempo] = useState<number | ''>('' as any);
  const [key, setKey] = useState('');
  const [duration, setDuration] = useState<number | ''>(20);
  const [instrumentation, setInstrumentation] = useState('');
  const [description, setDescription] = useState('');
  const [melody, setMelody] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      title.trim().length >= 3 &&
      !!genre && !!mood &&
      typeof tempo === 'number' && tempo >= 50 && tempo <= 220 &&
      !!key &&
      typeof duration === 'number' && duration >= 5 && duration <= 300 &&
      instrumentation.trim().length > 0 &&
      description.trim().length >= 5
    );
  }, [title, genre, mood, tempo, key, duration, instrumentation, description]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setMelody(f);
  };

  const buildPrompt = () => {
    return `${title}. Genre: ${genre}. Mood: ${mood}. Tempo: ${tempo} BPM. Key: ${key}. Instrumentation: ${instrumentation}. Description: ${description}.`;
  };

  const handleCompose = async () => {
    setErr(null);
    if (!canSubmit) {
      setErr('Please fill all required fields with valid values.');
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const prompt = buildPrompt();
    const createdAt = Date.now();
    addJob({ id, title, prompt, createdAt, status: 'in_progress', progress: 1 });

    try {
      let latestPath = '';
      const handlers = jsonlHandlers(
        (p) => updateJob(id, { progress: p, status: 'in_progress' }),
        (pth) => { latestPath = pth; }
      );
      const onClose = (_code?: number | null) => {
        const latest = getJob(id);
        if (!latest || latest.status === 'canceled') return;
        if (latestPath) {
          updateJob(id, { status: 'completed', progress: 100, wavPath: latestPath });
        } else {
          updateJob(id, { status: 'failed', error: 'Generation finished without output path' });
        }
      };

      if (melody) {
        const melodyPath = await saveTempFile(melody);
        await startMusicGenMelody(id, prompt, melodyPath, Number(duration), { ...handlers, onClose });
      } else {
        await startMusicGenText(id, prompt, Number(duration), { ...handlers, onClose });
      }
    } catch (e: any) {
      updateJob(id, { status: 'failed', error: String(e?.message || e) });
      setErr(String(e?.message || e));
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Compose Song</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField label="Title*" fullWidth value={title} onChange={(e)=>setTitle(e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField select label="Genre*" fullWidth value={genre} onChange={(e)=>setGenre(e.target.value)}>
            {GENRES.map(g=> <MenuItem key={g} value={g}>{g}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField select label="Mood*" fullWidth value={mood} onChange={(e)=>setMood(e.target.value)}>
            {MOODS.map(m=> <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField type="number" label="Tempo* (BPM)" fullWidth value={tempo} onChange={(e)=>setTempo(Number(e.target.value))} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField select label="Key*" fullWidth value={key} onChange={(e)=>setKey(e.target.value)}>
            {KEYS.map(k=> <MenuItem key={k} value={k}>{k}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField type="number" label="Duration* (sec)" fullWidth value={duration} onChange={(e)=>setDuration(Number(e.target.value))} />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Instrumentation*" fullWidth value={instrumentation} onChange={(e)=>setInstrumentation(e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Description*" fullWidth multiline minRows={3} value={description} onChange={(e)=>setDescription(e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <Button variant="outlined" component="label">
              {melody ? 'Change Melody' : 'Upload Melody (optional)'}
              <input type="file" hidden accept="audio/*" onChange={onFile} />
            </Button>
            {melody && <Typography variant="body2">{melody.name}</Typography>}
          </Stack>
        </Grid>
      </Grid>
      {err && <Typography color="error" sx={{ mt: 1 }}>{err}</Typography>}
      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Button variant="contained" disabled={!canSubmit} onClick={handleCompose}>Compose</Button>
      </Stack>
    </Box>
  );
}
