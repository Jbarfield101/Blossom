import { useState } from "react";
import { Button, Stack, TextField } from "@mui/material";
import Center from "./_Center";
import { useWorlds } from "../store/worlds";

export default function WorldBuilder() {
  const worlds = useWorlds((s) => s.worlds);
  const addWorld = useWorlds((s) => s.addWorld);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    addWorld(trimmed);
    setName("");
    setCreating(false);
  }

  return (
    <Center>
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 400 }}>
        {worlds.map((w) => (
          <Button key={w} variant="outlined">
            {w}
          </Button>
        ))}
        {creating ? (
          <>
            <TextField
              label="World Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button variant="contained" onClick={submit}>
              Submit
            </Button>
          </>
        ) : (
          <Button variant="contained" onClick={() => setCreating(true)}>
            Create New World
          </Button>
        )}
      </Stack>
    </Center>
  );
}
