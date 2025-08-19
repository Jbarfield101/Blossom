import { useEffect, useState, useMemo } from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Typography,
  IconButton,
  Stack,
  TextField,
  Button,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import AddIcon from '@mui/icons-material/Add';
import Center from './_Center';
import GenerateNPCModal from '../components/GenerateNPCModal';
import { useNPCs, NPC } from '../store/npcs';
import { invoke } from '@tauri-apps/api/core';

export default function NPCList() {
  const npcs = useNPCs((s) => s.npcs);
  const loadNPCs = useNPCs((s) => s.loadNPCs);

  const [tagFilter, setTagFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [crFilter, setCrFilter] = useState('');
  const [localeFilter, setLocaleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadNPCs();
  }, [loadNPCs]);

  const filtered = useMemo(() => {
    return npcs.filter((n) => {
      if (tagFilter && !(n.tags || []).includes(tagFilter)) return false;
      if (roleFilter && n.role !== roleFilter) return false;
      if (crFilter && String(n.cr) !== crFilter) return false;
      if (localeFilter && n.locale !== localeFilter) return false;
      return true;
    });
  }, [npcs, tagFilter, roleFilter, crFilter, localeFilter]);

  function copyJson(npc: NPC) {
    navigator.clipboard.writeText(JSON.stringify(npc, null, 2));
  }

  function copyDiscord(npc: NPC) {
    navigator.clipboard.writeText(JSON.stringify(npc));
  }

  function openPdf(npc: NPC) {
    invoke('generate_npc_pdf', { npc });
  }

  function playVoice(npc: NPC) {
    invoke('play_voice', { text: npc.name });
  }

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
            label="CR"
            value={crFilter}
            onChange={(e) => setCrFilter(e.target.value)}
          />
          <TextField
            label="Locale"
            value={localeFilter}
            onChange={(e) => setLocaleFilter(e.target.value)}
          />
        </Stack>
        {filtered.length === 0 ? (
          <Typography>No NPCs found.</Typography>
        ) : (
          <Grid container spacing={2}>
            {filtered.map((npc) => (
              <Grid item xs={12} sm={6} md={4} key={npc.id}>
                <Card>
                  {npc.portrait && (
                    <CardMedia
                      component="img"
                      height="140"
                      image={npc.portrait}
                      alt={npc.name}
                    />
                  )}
                  <CardContent>
                    <Typography variant="h6">{npc.name}</Typography>
                    <Typography variant="body2">
                      {npc.race} {npc.class}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <IconButton onClick={() => openPdf(npc)}>
                      <PictureAsPdfIcon />
                    </IconButton>
                    <IconButton onClick={() => playVoice(npc)}>
                      <VolumeUpIcon />
                    </IconButton>
                    <IconButton onClick={() => copyJson(npc)}>
                      <ContentCopyIcon />
                    </IconButton>
                    <IconButton onClick={() => copyDiscord(npc)}>
                      <ShareIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>
      <GenerateNPCModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </Center>
  );
}

