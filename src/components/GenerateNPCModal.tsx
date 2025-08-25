import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
} from '@mui/material';
import { invoke } from '@tauri-apps/api/core';
import { useNPCs } from '../store/npcs';
import type { Npc } from '../dnd/schemas/npc';

const systemPrompt =
  'You are a creative assistant that generates random D&D NPCs. Respond only with JSON having keys name, species, role, backstory.';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GenerateNPCModal({ open, onClose }: Props) {
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const addNPC = useNPCs((s) => s.addNPC);

  async function generate() {
    setLoading(true);
    try {
      for (let i = 0; i < count; i++) {
        const reply: string = await invoke('general_chat', {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Generate a random NPC.' },
          ],
        });
        try {
          const parsed = JSON.parse(reply) as Partial<Npc>;
          const data: Omit<Npc, 'id'> = {
            species: '',
            role: '',
            alignment: 'Unaligned',
            playerCharacter: false,
            hooks: [],
            statblock: {},
            tags: [],
            portrait: 'placeholder.png',
            icon: 'placeholder-icon.png',
            ...parsed,
          };
          addNPC(data);
        } catch {
          // ignore parse errors for now
        }
      }
    } finally {
      setLoading(false);
      onClose();
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Generate NPC</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Batch count"
            type="number"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
            inputProps={{ min: 1 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={generate} disabled={loading} variant="contained">
          Generate
        </Button>
      </DialogActions>
    </Dialog>
  );
}

