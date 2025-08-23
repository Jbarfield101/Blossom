import { useState } from 'react';
import { Stack, TextField, Button, Typography } from '@mui/material';
import { useCharacter } from '../store/character';
import type { Character } from '../dnd/characters';

export default function CharacterSheet() {
  const stored = useCharacter((s) => s.character);
  const setCharacter = useCharacter((s) => s.setCharacter);
  const [character, setCharacterState] = useState<Character>(
    stored ?? {
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      class: '',
      level: 1,
      hp: 0,
      inventory: [],
    }
  );

  const updateAbility = (key: string, value: number) =>
    setCharacterState((prev) => ({
      ...prev,
      abilities: { ...prev.abilities, [key]: value },
    }));

  const updateInventory = (value: string) =>
    setCharacterState((prev) => ({
      ...prev,
      inventory: value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }));

  const save = () => setCharacter(character);

  return (
    <Stack spacing={2} sx={{ maxWidth: 400 }}>
      <Typography variant="h5">Character Sheet</Typography>
      <TextField
        label="Class"
        value={character.class}
        onChange={(e) =>
          setCharacterState({ ...character, class: e.target.value })
        }
      />
      <TextField
        label="Level"
        type="number"
        value={character.level}
        onChange={(e) =>
          setCharacterState({
            ...character,
            level: parseInt(e.target.value, 10) || 0,
          })
        }
      />
      <TextField
        label="HP"
        type="number"
        value={character.hp}
        onChange={(e) =>
          setCharacterState({
            ...character,
            hp: parseInt(e.target.value, 10) || 0,
          })
        }
      />
      <Typography variant="h6">Abilities</Typography>
      <Stack direction="row" spacing={1}>
        {['str', 'dex', 'con', 'int', 'wis', 'cha'].map((key) => (
          <TextField
            key={key}
            label={key.toUpperCase()}
            type="number"
            value={character.abilities[key] || 0}
            onChange={(e) =>
              updateAbility(key, parseInt(e.target.value, 10) || 0)
            }
            sx={{ width: 60 }}
          />
        ))}
      </Stack>
      <TextField
        label="Inventory"
        value={character.inventory.join(', ')}
        onChange={(e) => updateInventory(e.target.value)}
      />
      <Button variant="contained" onClick={save}>
        Save
      </Button>
    </Stack>
  );
}

