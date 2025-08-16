import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button, Stack, TextField, Typography } from '@mui/material';
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
    } catch (e) {
      setError(String(e));
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
        <Typography variant="h4">NPC Maker</Typography>
        {error && <Typography color="error">{error}</Typography>}
        <Button variant="contained" onClick={generate} disabled={loading}>
          Generate NPC
        </Button>
        <TextField
          label="Name"
          value={npc.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
        <TextField
          label="Race"
          value={npc.race}
          onChange={(e) => handleChange('race', e.target.value)}
        />
        <TextField
          label="Class"
          value={npc.class}
          onChange={(e) => handleChange('class', e.target.value)}
        />
        <TextField
          label="Personality"
          multiline
          value={npc.personality}
          onChange={(e) => handleChange('personality', e.target.value)}
        />
        <TextField
          label="Background"
          multiline
          value={npc.background}
          onChange={(e) => handleChange('background', e.target.value)}
        />
        <TextField
          label="Appearance"
          multiline
          value={npc.appearance}
          onChange={(e) => handleChange('appearance', e.target.value)}
        />
        <Button variant="contained" onClick={save} disabled={loading}>
          Save NPC
        </Button>
      </Stack>
    </Center>
  );
}
