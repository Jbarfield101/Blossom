import { useEffect, useRef, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import Center from './_Center';
import { useInventory } from '../store/inventory';
import { useNPCs } from '../store/npcs';
import { useWorlds } from '../store/worlds';

type Order = 'asc' | 'desc';
type OrderBy = 'name' | 'value';

export default function WorldInventory() {
  const items = useInventory((s) => Object.values(s.items));
  const npcs = useNPCs((s) => s.npcs);
  const loadNPCs = useNPCs((s) => s.loadNPCs);
  const world = useWorlds((s) => s.currentWorld);
  const { hash } = useLocation();

  const lastWorld = useRef<string>();
  useEffect(() => {
    if (world && world !== lastWorld.current) {
      loadNPCs(world);
      lastWorld.current = world;
    }
  }, [world, loadNPCs]);

  const lastHash = useRef<string>();
  useEffect(() => {
    if (hash && hash !== lastHash.current) {
      const el = document.getElementById(hash.substring(1));
      if (el) el.scrollIntoView();
      lastHash.current = hash;
    }
  }, [hash, items]);

  const [orderBy, setOrderBy] = useState<OrderBy>('name');
  const [order, setOrder] = useState<Order>('asc');

  const handleSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sorted = [...items].sort((a, b) => {
    const aVal = (a[orderBy] || 0) as number | string;
    const bVal = (b[orderBy] || 0) as number | string;
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <Center>
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 900 }}>
        <Typography variant="h4">World Inventory</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'value'}
                  direction={orderBy === 'value' ? order : 'asc'}
                  onClick={() => handleSort('value')}
                >
                  Value
                </TableSortLabel>
              </TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell>NPCs</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((item) => (
              <TableRow key={item.id} id={item.id} hover>
                <TableCell>{item.name}</TableCell>
                <TableCell align="right">{item.value ?? ''}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {(item.tags || []).map((tag) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {item.npcIds.map((id) => {
                      const npc = npcs.find((n) => n.id === id);
                      return npc ? (
                        <Chip
                          key={id}
                          label={npc.name}
                          component={Link}
                          to={`/dnd/npcs/${id}`}
                          clickable
                          size="small"
                        />
                      ) : null;
                    })}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Stack>
    </Center>
  );
}

