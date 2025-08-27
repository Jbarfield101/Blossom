import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Typography,
  Stack,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
} from '@mui/material';
import Center from './_Center';
import { useNPCs } from '../store/npcs';
import { useWorlds } from '../store/worlds';
import { useInventory } from '../store/inventory';
import { generateAudio } from '../features/voice/bark';
import * as Tone from 'tone';

export default function NPCDetail() {
  const { id } = useParams<{ id: string }>();
  const npcs = useNPCs((s) => s.npcs);
  const loadNPCs = useNPCs((s) => s.loadNPCs);
  const world = useWorlds((s) => s.currentWorld);
  const items = useInventory((s) => s.items);

  useEffect(() => {
    if (world) loadNPCs(world);
  }, [loadNPCs, world]);

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
          {npc.species} {npc.role}
        </Typography>
        {npc.voiceId && (
          <Button
            variant="outlined"
            onClick={() => {
              generateAudio(npc.backstory || npc.name, npc.voiceId as string)
                .then((buf) => {
                  const player = new Tone.Player(buf).toDestination();
                  player.start();
                })
                .catch(() => {});
            }}
          >
            Play Voice
          </Button>
        )}
        {npc.portrait && (
          <img
            src={npc.portrait}
            alt={npc.name}
            style={{ maxWidth: '100%', borderRadius: 4 }}
          />
        )}
        {npc.alignment && (
          <Typography>
            <strong>Alignment:</strong> {npc.alignment}
          </Typography>
        )}
        {npc.location && (
          <Typography>
            <strong>Location:</strong> {npc.location}
          </Typography>
        )}
        {npc.tags && npc.tags.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {npc.tags.map((tag) => (
              <Chip key={tag} label={tag} />
            ))}
          </Stack>
        )}
        {npc.backstory && (
          <Typography>
            <strong>Backstory:</strong> {npc.backstory}
          </Typography>
        )}
        {npc.inventory && npc.inventory.length > 0 && (
          <div>
            <Typography>
              <strong>Inventory:</strong>
            </Typography>
            <List>
              {npc.inventory.map((item, idx) => {
                const entry = Object.values(items).find((i) => i.name === item);
                return (
                  <ListItem key={idx}>
                    <ListItemText
                      primary={
                        entry ? (
                          <Link to={`/dnd/world-inventory#${entry.id}`}>{item}</Link>
                        ) : (
                          item
                        )
                      }
                    />
                  </ListItem>
                );
              })}
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
        {npc.statblock && (
          <div>
            <Typography>
              <strong>Statblock:</strong>
            </Typography>
            <List>
              {Object.entries(npc.statblock).map(([key, value]) => (
                <ListItem key={key}>
                  <ListItemText primary={`${key}: ${String(value)}`} />
                </ListItem>
              ))}
            </List>
          </div>
        )}
      </Stack>
    </Center>
  );
}

