import { List, ListItem, Stack, Typography } from '@mui/material';
import type { Quest } from '../dnd/quests';

interface Props {
  quests: Quest[];
}

export default function QuestLog({ quests }: Props) {
  const active = quests.filter((q) => q.status === 'active');
  const completed = quests.filter((q) => q.status === 'completed');

  const renderQuest = (quest: Quest) => (
    <ListItem key={quest.title} alignItems="flex-start">
      <Stack>
        <Typography variant="subtitle1">{quest.title}</Typography>
        <List sx={{ pl: 2 }}>
          {quest.objectives.map((obj, idx) => (
            <ListItem key={idx} sx={{ display: 'list-item' }}>
              <Typography variant="body2">
                {obj.completed ? '✓ ' : ''}
                {obj.description}
              </Typography>
            </ListItem>
          ))}
        </List>
      </Stack>
    </ListItem>
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Active Quests</Typography>
      <List>{active.map(renderQuest)}</List>
      <Typography variant="h6">Completed Quests</Typography>
      <List>{completed.map(renderQuest)}</List>
    </Stack>
  );
}
