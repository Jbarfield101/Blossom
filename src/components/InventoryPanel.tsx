import { useState, useEffect } from 'react';
import { TextField, Stack } from '@mui/material';
import type { Item } from '../dnd/items';

interface Props {
  items: Item[];
  onChange: (items: Item[]) => void;
}

export default function InventoryPanel({ items, onChange }: Props) {
  const [text, setText] = useState('');

  useEffect(() => {
    setText(items.map((i) => i.name).join(', '));
  }, [items]);

  const handleChange = (value: string) => {
    setText(value);
    const list: Item[] = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name, quantity: 1 }));
    onChange(list);
  };

  return (
    <Stack>
      <TextField
        label="Inventory"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
      />
    </Stack>
  );
}
