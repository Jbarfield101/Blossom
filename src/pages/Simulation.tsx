import { Box, Button, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function Simulation() {
  const nav = useNavigate();
  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Button variant="contained" onClick={() => nav("/big-brother")}>Big Brother</Button>
      </Stack>
    </Box>
  );
}

