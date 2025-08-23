import { Button, Stack, Typography } from '@mui/material';
import { useEncounterStore } from '../../store/encounter';

export default function EncounterTracker() {
  const encounter = useEncounterStore((s) => s.encounter);
  const startEncounter = useEncounterStore((s) => s.startEncounter);
  const nextTurn = useEncounterStore((s) => s.nextTurn);
  const endEncounter = useEncounterStore((s) => s.endEncounter);

  const start = () =>
    startEncounter([
      { name: 'Hero', initiative: 15 },
      { name: 'Goblin', initiative: 12 },
    ]);

  const current = encounter?.participants[encounter.current]?.name;

  return (
    <Stack spacing={2} sx={{ maxWidth: 300 }}>
      <Typography variant="h6">Encounter Tracker</Typography>
      {encounter && <Typography>Current: {current}</Typography>}
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={start} disabled={!!encounter}>
          Start Encounter
        </Button>
        <Button
          variant="outlined"
          onClick={nextTurn}
          disabled={!encounter}
        >
          Next Turn
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={endEncounter}
          disabled={!encounter}
        >
          End Combat
        </Button>
      </Stack>
    </Stack>
  );
}
