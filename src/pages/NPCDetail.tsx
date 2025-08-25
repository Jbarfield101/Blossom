import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Typography,
  Stack,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import Center from './_Center';
import { useNPCs } from '../store/npcs';

export default function NPCDetail() {
  const { id } = useParams<{ id: string }>();
  const npcs = useNPCs((s) => s.npcs);
  const loadNPCs = useNPCs((s) => s.loadNPCs);

  useEffect(() => {
    loadNPCs();
  }, [loadNPCs]);

  const npc = npcs.find((n) => n.id === id);

  if (!npc) {
    return (
      <Center>
        <Typography>NPC not found</Typography>
      </Center>
    );
  }

  return (
    <Center>
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 800 }}>
        <Typography variant="h4">{npc.name}</Typography>
        <Typography variant="subtitle1">
          {npc.race} {npc.class}
        </Typography>
        {npc.portrait && (
          <img
            src={npc.portrait}
            alt={npc.name}
            style={{ maxWidth: '100%', borderRadius: 4 }}
          />
        )}
        {npc.role && (
          <Typography>
            <strong>Role:</strong> {npc.role}
          </Typography>
        )}
        {npc.cr !== undefined && (
          <Typography>
            <strong>CR:</strong> {npc.cr}
          </Typography>
        )}
        {npc.locale && (
          <Typography>
            <strong>Locale:</strong> {npc.locale}
          </Typography>
        )}
        {npc.tags && npc.tags.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {npc.tags.map((tag) => (
              <Chip key={tag} label={tag} />
            ))}
          </Stack>
        )}
        {npc.personality && (
          <Typography>
            <strong>Personality:</strong> {npc.personality}
          </Typography>
        )}
        {npc.background && (
          <Typography>
            <strong>Background:</strong> {npc.background}
          </Typography>
        )}
        {npc.appearance && (
          <Typography>
            <strong>Appearance:</strong> {npc.appearance}
          </Typography>
        )}
        {npc.inventory && npc.inventory.length > 0 && (
          <div>
            <Typography>
              <strong>Inventory:</strong>
            </Typography>
            <List>
              {npc.inventory.map((item, idx) => (
                <ListItem key={idx}>
                  <ListItemText primary={item} />
                </ListItem>
              ))}
            </List>
          </div>
        )}
        {npc.hooks && npc.hooks.length > 0 && (
          <div>
            <Typography>
              <strong>Hooks:</strong>
            </Typography>
            <List>
              {npc.hooks.map((hook, idx) => (
                <ListItem key={idx}>
                  <ListItemText primary={hook} />
                </ListItem>
              ))}
            </List>
          </div>
        )}
        {npc.quirks && npc.quirks.length > 0 && (
          <div>
            <Typography>
              <strong>Quirks:</strong>
            </Typography>
            <List>
              {npc.quirks.map((quirk, idx) => (
                <ListItem key={idx}>
                  <ListItemText primary={quirk} />
                </ListItem>
              ))}
            </List>
          </div>
        )}
        {npc.secrets && npc.secrets.length > 0 && (
          <div>
            <Typography>
              <strong>Secrets:</strong>
            </Typography>
            <List>
              {npc.secrets.map((secret, idx) => (
                <ListItem key={idx}>
                  <ListItemText primary={secret} />
                </ListItem>
              ))}
            </List>
          </div>
        )}
        {npc.stats && (
          <div>
            <Typography>
              <strong>Stats:</strong>
            </Typography>
            <List>
              {Object.entries(npc.stats).map(([key, value]) => (
                <ListItem key={key}>
                  <ListItemText primary={`${key}: ${value}`} />
                </ListItem>
              ))}
            </List>
          </div>
        )}
        {npc.skills && (
          <div>
            <Typography>
              <strong>Skills:</strong>
            </Typography>
            <List>
              {Object.entries(npc.skills).map(([key, value]) => (
                <ListItem key={key}>
                  <ListItemText primary={`${key}: ${value}`} />
                </ListItem>
              ))}
            </List>
          </div>
        )}
      </Stack>
    </Center>
  );
}

