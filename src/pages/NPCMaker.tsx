import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Button, Stack, TextField, Typography, Alert, CircularProgress, Snackbar, FormControlLabel, Checkbox } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import Center from './_Center';
import { useNPCs } from '../store/npcs';
import type { Npc } from '../dnd/schemas/npc';
import { useWorlds } from '../store/worlds';

const systemPrompt =
  'You are a creative assistant that generates random D&D NPCs. Respond only with JSON having keys name, species, role, backstory.';

export default function NPCMaker() {
  const [npc, setNpc] = useState<Omit<Npc, 'id'>>({
    name: '',
    species: '',
    role: '',
    alignment: '',
    age: undefined,
    backstory: '',
    location: '',
    hooks: ['Hook'],
    quirks: [],
    appearance: 'Unknown',
    portrait: 'placeholder.png',
    icon: 'placeholder-icon.png',
    playerCharacter: false,
    statblock: {},
    tags: ['npc'],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const addNPC = useNPCs((s) => s.addNPC);
  const world = useWorlds((s) => s.currentWorld);

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

      let data: Partial<Npc> | null = null;

      try {
        data = JSON.parse(reply);
      } catch {
        const keys: (keyof Omit<Npc, 'id'>)[] = [
          'name',
          'species',
          'role',
          'backstory',
        ];

        const fallback: Partial<Npc> = {};
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

  function handleChange(
    field: keyof Omit<Npc, 'id'>,
    value: string | boolean | number | undefined
  ) {
    setNpc((prev) => ({ ...prev, [field]: value }));
  }

  async function selectImage(field: 'portrait' | 'icon') {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    });
    if (typeof selected === 'string') {
      handleChange(field, selected);
    }
  }

  async function save() {
    setError('');
    const required: (keyof Omit<Npc, 'id'>)[] = [
      'name',
      'species',
      'role',
      'backstory',
    ];
    for (const field of required) {
      const value = npc[field];
      if (typeof value !== 'string' || !value.trim()) {
        setError('Please fill in all fields before saving.');
        return;
      }
    }
    if (
      npc.portrait === 'placeholder.png' ||
      npc.icon === 'placeholder-icon.png'
    ) {
      setError('Please upload a portrait and icon before saving.');
      return;
    }
    if (!world) {
      setError('Please select a world before saving.');
      return;
    }
    try {
      const saved = await invoke<Npc>('save_npc', { world, npc });
      addNPC(saved);
      setNpc({
        name: '',
        species: '',
        role: '',
        alignment: '',
        age: undefined,
        backstory: '',
        location: '',
        hooks: ['Hook'],
        quirks: [],
        appearance: 'Unknown',
        portrait: 'placeholder.png',
        icon: 'placeholder-icon.png',
        playerCharacter: false,
        statblock: {},
        tags: ['npc'],
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
          label="Species"
          value={npc.species}
          onChange={(e) => handleChange('species', e.target.value)}
          fullWidth
        />
        <TextField
          label="Role/Occupation"
          value={npc.role}
          onChange={(e) => handleChange('role', e.target.value)}
          fullWidth
        />
        <TextField
          label="Alignment"
          value={npc.alignment}
          onChange={(e) => handleChange('alignment', e.target.value)}
          fullWidth
        />
        <TextField
          label="Age"
          type="number"
          value={npc.age ?? ''}
          onChange={(e) =>
            handleChange('age', e.target.value ? Number(e.target.value) : undefined)
          }
          fullWidth
        />
        <TextField
          label="Backstory"
          multiline
          value={npc.backstory}
          onChange={(e) => handleChange('backstory', e.target.value)}
          fullWidth
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={npc.playerCharacter}
              onChange={(e) => handleChange('playerCharacter', e.target.checked)}
            />
          }
          label="Player Character"
        />
        <Button variant="outlined" onClick={() => selectImage('portrait')}>
          Upload Portrait
        </Button>
        {npc.portrait && <Typography>{npc.portrait}</Typography>}
        <Button variant="outlined" onClick={() => selectImage('icon')}>
          Upload Icon
        </Button>
        {npc.icon && <Typography>{npc.icon}</Typography>}
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
