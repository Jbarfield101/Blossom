import { useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  Stack,
  Typography,
  Button,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MergeIcon from '@mui/icons-material/MergeType';
import Center from './_Center';
import { useTags } from '../store/tags';

export default function TagManager() {
  const { tags, loadFromData, renameTag, deleteTag, mergeTags } = useTags();

  useEffect(() => {
    loadFromData();
  }, [loadFromData]);

  return (
    <Center>
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 600 }}>
        <Typography variant="h4">Tag Manager</Typography>
        {tags.length === 0 ? (
          <Typography>No tags found.</Typography>
        ) : (
          <List>
            {tags.map((tag) => (
              <ListItem
                key={tag}
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      edge="end"
                      aria-label="rename"
                      onClick={() => {
                        const name = window.prompt('New name', tag);
                        if (name) renameTag(tag, name);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="merge"
                      onClick={() => {
                        const target = window.prompt('Merge into tag', tag);
                        if (target) mergeTags(tag, target);
                      }}
                    >
                      <MergeIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => {
                        if (window.confirm(`Delete tag ${tag}?`)) deleteTag(tag);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemText primary={tag} />
              </ListItem>
            ))}
          </List>
        )}
        <Button
          variant="outlined"
          onClick={() => loadFromData()}
        >
          Refresh
        </Button>
      </Stack>
    </Center>
  );
}
