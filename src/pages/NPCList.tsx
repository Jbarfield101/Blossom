import { Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper, IconButton, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import Center from './_Center';
import { useNPCs } from '../store/npcs';

export default function NPCList() {
  const npcs = useNPCs((s) => s.npcs);
  const removeNPC = useNPCs((s) => s.removeNPC);
  const loadNPCs = useNPCs((s) => s.loadNPCs);

  useEffect(() => {
    loadNPCs();
  }, [loadNPCs]);

  return (
    <Center>
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 900 }}>
        <Typography variant="h4">NPC List</Typography>
        {npcs.length === 0 ? (
          <Typography>No NPCs saved.</Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Race</TableCell>
                  <TableCell>Class</TableCell>
                  <TableCell>Personality</TableCell>
                  <TableCell>Background</TableCell>
                  <TableCell>Appearance</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {npcs.map((npc, index) => (
                  <TableRow key={index}>
                    <TableCell>{npc.name}</TableCell>
                    <TableCell>{npc.race}</TableCell>
                    <TableCell>{npc.class}</TableCell>
                    <TableCell>{npc.personality}</TableCell>
                    <TableCell>{npc.background}</TableCell>
                    <TableCell>{npc.appearance}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => removeNPC(index)}>
                        <TrashIcon className="h-5 w-5" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </Center>
  );
}
