import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button, Stack, TextField, Typography, Alert, CircularProgress } from '@mui/material';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import Center from './_Center';
import { useNPCs, NPC } from '../store/npcs';

const systemPrompt =
  'You are a creative assistant that generates random D&D NPCs. Respond only with JSON having keys name, race, class, personality, background, appearance.';

export default function NPCMaker() {
  const [npc, setNpc] = useState<NPC>({
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
      const jsonMatch = reply.match(/```json\n([\s\S]*?)```/);
      const data = JSON.parse(jsonMatch ? jsonMatch[1] : reply);
      setNpc((prev) => ({ ...prev, ...data }));
      setStatus('success');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field: keyof NPC, value: string) {
    setNpc((prev) => ({ ...prev, [field]: value }));
  }

  function save() {
    addNPC(npc);
    setNpc({
      name: '',
      race: '',
      class: '',
      personality: '',
      background: '',
      appearance: '',
    });
  }

  return (
    <Center>
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 500 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h4">NPC Maker</Typography>
          {status === 'loading' && <CircularProgress size={24} />}
          {status === 'success' && (
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
          )}
          {status === 'error' && (
            <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
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
      </Stack>
    </Center>
  );
}
