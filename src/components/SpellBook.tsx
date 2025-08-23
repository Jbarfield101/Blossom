import { useEffect, useState } from 'react';
import { Stack, TextField, Typography } from '@mui/material';
import type { Spell } from '../dnd/spells';

interface Props {
  spells: Spell[];
  spellSlots: Record<number, number>;
  onSpellsChange: (spells: Spell[]) => void;
  onSlotsChange: (slots: Record<number, number>) => void;
}

export default function SpellBook({
  spells,
  spellSlots,
  onSpellsChange,
  onSlotsChange,
}: Props) {
  const [spellText, setSpellText] = useState('');
  const [slotText, setSlotText] = useState('');

  useEffect(() => {
    setSpellText(spells.map((s) => s.name).join(', '));
    setSlotText(
      Object.entries(spellSlots)
        .map(([lvl, cnt]) => `${lvl}:${cnt}`)
        .join(', ')
    );
  }, [spells, spellSlots]);

  const handleSpells = (value: string) => {
    setSpellText(value);
    const list: Spell[] = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        level: 0,
        school: 'unknown',
      }));
    onSpellsChange(list);
  };

  const handleSlots = (value: string) => {
    setSlotText(value);
    const entries = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((pair) => pair.split(':'))
      .filter((arr) => arr.length === 2)
      .map(([lvl, cnt]) => [parseInt(lvl, 10), parseInt(cnt, 10)] as const)
      .filter(([lvl, cnt]) => !isNaN(lvl) && !isNaN(cnt));
    const record: Record<number, number> = {};
    for (const [lvl, cnt] of entries) {
      record[lvl] = cnt;
    }
    onSlotsChange(record);
  };

  return (
    <Stack spacing={1}>
      <Typography variant="h6">Spells</Typography>
      <TextField
        label="Spells"
        value={spellText}
        onChange={(e) => handleSpells(e.target.value)}
      />
      <TextField
        label="Spell Slots (level:count)"
        value={slotText}
        onChange={(e) => handleSlots(e.target.value)}
      />
    </Stack>
  );
}
