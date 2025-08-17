import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button, Stack, TextField, Typography, Alert, CircularProgress, Snackbar } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import Center from './_Center';
import { useNPCs, NPC } from '../store/npcs';

const systemPrompt =
  'You are a creative assistant that generates random D&D NPCs. Respond only with JSON having keys name, race, class, personality, background, appearance.';

export default function NPCMaker() {
  const [npc, setNpc] = useState<Omit<NPC, 'id'>>({
    name: '',
    race: '',
    class: '',
    personality: '',
    background: '',
    appearance: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const addNPC = useNPCs((s) => s.addNPC);

  useEffect(() => {
    async function start() {
      try {
        await invoke('start_ollama');
      } catch (e) {
        setError(String(e));
      }
    }
    start();
  }, []);

  async function generate() {
    setLoading(true);
    setError('');
    setStatus('loading');
    try {
      const reply: string = await invoke('general_chat', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate a random NPC.' },
        ],
      });

      let data: Partial<NPC> | null = null;

      try {
        data = JSON.parse(reply);
      } catch {
        const keys: (keyof Omit<NPC, 'id'>)[] = [
          'name',
          'race',
          'class',
          'personality',
          'background',
          'appearance',
        ];

        const fallback: Partial<NPC> = {};
        for (const key of keys) {
          const keyIndex = reply.indexOf(`"${key}"`);
          if (keyIndex === -1) continue;
          const colon = reply.indexOf(':', keyIndex);
          const valueStart = reply.indexOf('"', colon);
          const valueEnd = reply.indexOf('"', valueStart + 1);
          if (colon === -1 || valueStart === -1 || valueEnd === -1) continue;
          fallback[key] = reply.slice(valueStart + 1, valueEnd);
        }
        if (Object.keys(fallback).length) {
          data = fallback;
        }
      }

      if (!data) {
        throw new Error('parse');
      }

      setNpc((prev) => ({ ...prev, ...data }));
      setStatus('success');
    } catch (e) {
      setError(
        e instanceof Error && e.message === 'parse'
          ? 'Failed to parse NPC data. Please try again.'
          : String(e)
      );
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field: keyof Omit<NPC, 'id'>, value: string) {
    setNpc((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    setError('');
    const required: (keyof Omit<NPC, 'id'>)[] = [
      'name',
      'race',
      'class',
      'personality',
      'background',
      'appearance',
    ];
    for (const field of required) {
      if (!npc[field].trim()) {
        setError('Please fill in all fields before saving.');
        return;
      }
    }
    try {
      await invoke('save_npc', { npc });
      addNPC(npc);
      setNpc({
        name: '',
        race: '',
        class: '',
        personality: '',
        background: '',
        appearance: '',
      });
      setSnackbarOpen(true);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <Center>
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 500 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h4">NPC Maker</Typography>
          {status === 'loading' && <CircularProgress size={24} />}
          {status === 'success' && (
            <CheckCircleIcon color="success" fontSize="small" />
          )}
          {status === 'error' && (
            <ErrorIcon color="error" fontSize="small" />
          )}
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        <Button variant="contained" onClick={generate} disabled={loading}>
          Generate NPC
        </Button>
        <TextField
          label="Name"
          value={npc.name}
          onChange={(e) => handleChange('name', e.target.value)}
          fullWidth
        />
        <TextField
          label="Race"
          value={npc.race}
          onChange={(e) => handleChange('race', e.target.value)}
          fullWidth
        />
        <TextField
          label="Class"
          value={npc.class}
          onChange={(e) => handleChange('class', e.target.value)}
          fullWidth
        />
        <TextField
          label="Personality"
          multiline
          value={npc.personality}
          onChange={(e) => handleChange('personality', e.target.value)}
          fullWidth
        />
        <TextField
          label="Background"
          multiline
          value={npc.background}
          onChange={(e) => handleChange('background', e.target.value)}
          fullWidth
        />
        <TextField
          label="Appearance"
          multiline
          value={npc.appearance}
          onChange={(e) => handleChange('appearance', e.target.value)}
          fullWidth
        />
        <Button variant="contained" onClick={save} disabled={loading}>
          Save NPC
        </Button>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSnackbarOpen(false)}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity="success"
            sx={{ width: '100%' }}
          >
            NPC saved successfully!
          </Alert>
        </Snackbar>
      </Stack>
    </Center>
  );
}
