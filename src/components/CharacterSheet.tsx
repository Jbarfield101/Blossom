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

