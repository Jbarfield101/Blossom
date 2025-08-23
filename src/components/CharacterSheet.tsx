import { useState } from 'react';
import { Stack, TextField, Button, Typography } from '@mui/material';
import { useCharacter } from '../store/character';
import type { Ability, Character } from '../dnd/characters';
import InventoryPanel from './InventoryPanel';
import SpellBook from './SpellBook';

export default function CharacterSheet() {
  const stored = useCharacter((s) => s.character);
  const setCharacter = useCharacter((s) => s.setCharacter);
  const abilityKeys: Ability[] = [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
  ];
  const [character, setCharacterState] = useState<Character>(
    stored ?? {
      abilities: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      class: '',
      level: 1,
      hp: 0,
      inventory: [],
      spells: [],
      spellSlots: {},
    }
  );
  const [levelError, setLevelError] = useState(false);
  const [hpError, setHpError] = useState(false);

  const updateAbility = (key: Ability, value: number) =>
    setCharacterState((prev) => ({
      ...prev,
      abilities: { ...prev.abilities, [key]: value },
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
        error={levelError}
        helperText={levelError ? 'Enter a valid level' : undefined}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          if (Number.isNaN(parsed)) {
            setLevelError(true);
            return;
          }
          setLevelError(false);
          setCharacterState({
            ...character,
            level: Math.max(0, parsed),
          });
        }}
      />
      <TextField
        label="HP"
        type="number"
        value={character.hp}
        error={hpError}
        helperText={hpError ? 'Enter a valid HP' : undefined}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          if (Number.isNaN(parsed)) {
            setHpError(true);
            return;
          }
          setHpError(false);
          setCharacterState({
            ...character,
            hp: Math.max(0, parsed),
          });
        }}
      />
      <Typography variant="h6">Abilities</Typography>
      <Stack direction="row" spacing={1}>
        {abilityKeys.map((key) => (
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
      <InventoryPanel
        items={character.inventory}
        onChange={(items) =>
          setCharacterState((prev) => ({ ...prev, inventory: items }))
        }
      />
      <SpellBook
        spells={character.spells}
        spellSlots={character.spellSlots}
        onSpellsChange={(spells) =>
          setCharacterState((prev) => ({ ...prev, spells }))
        }
        onSlotsChange={(slots) =>
          setCharacterState((prev) => ({ ...prev, spellSlots: slots }))
        }
      />
      <Button variant="contained" onClick={save}>
        Save
      </Button>
    </Stack>
  );
}

