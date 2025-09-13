import { useState } from "react";
import { Button, Stack, TextField, IconButton } from "@mui/material";
import Center from "./_Center";
import { useWorlds } from "../store/worlds";
import { TrashIcon } from "@heroicons/react/24/outline";
import BackButton from "../components/BackButton";

export default function WorldBuilder() {
  const worlds = useWorlds((s) => s.worlds);
  const addWorld = useWorlds((s) => s.addWorld);
  const removeWorld = useWorlds((s) => s.removeWorld);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (worlds.some((w) => w.toLowerCase() === trimmed.toLowerCase())) return;
    addWorld(trimmed);
    setName("");
    setCreating(false);
  }

  return (
    <Center>
      <BackButton />
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 400 }}>
        {worlds.map((w) => (
          <Stack direction="row" spacing={1} key={w}>
            <Button variant="outlined" sx={{ flexGrow: 1 }}>
              {w}
            </Button>
            <IconButton onClick={() => removeWorld(w)}>
              <TrashIcon width={20} height={20} />
            </IconButton>
          </Stack>
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
