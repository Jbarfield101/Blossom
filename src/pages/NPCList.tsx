import { useEffect, useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  TextField,
  Button,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Center from './_Center';
import GenerateNPCModal from '../components/GenerateNPCModal';
import { useNPCs } from '../store/npcs';
import { Link } from 'react-router-dom';

export default function NPCList() {
  const npcs = useNPCs((s) => s.npcs);
  const loadNPCs = useNPCs((s) => s.loadNPCs);

  const [tagFilter, setTagFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadNPCs();
  }, [loadNPCs]);

  const filtered = useMemo(() => {
    return npcs.filter((n) => {
      if (tagFilter && !(n.tags || []).includes(tagFilter)) return false;
      if (roleFilter && n.role !== roleFilter) return false;
      if (locationFilter && n.location !== locationFilter) return false;
      return true;
    });
  }, [npcs, tagFilter, roleFilter, locationFilter]);

  return (
    <Center>
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 1200 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h4" sx={{ flexGrow: 1 }}>
            NPC Library
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setModalOpen(true)}
          >
            Generate NPC
          </Button>
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Tag"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          />
          <TextField
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
          <TextField
            label="Location"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          />
        </Stack>
        {filtered.length === 0 ? (
          <Typography>No NPCs found.</Typography>
        ) : (
          <List>
            {filtered.map((npc) => (
              <ListItemButton key={npc.id}>
                <Link
                  to={`/dnd/npcs/${npc.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}
                >
                  <ListItemText primary={npc.name} />
                </Link>
              </ListItemButton>
            ))}
          </List>
        )}
      </Stack>
      <GenerateNPCModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </Center>
  );
}

