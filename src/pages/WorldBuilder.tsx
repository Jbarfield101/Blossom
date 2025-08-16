import { useState, useEffect } from "react";
import { Button, Stack, TextField } from "@mui/material";
import Center from "./_Center";

export default function WorldBuilder() {
  const [worlds, setWorlds] = useState<string[]>(() => {
    const saved = localStorage.getItem("dnd_worlds");
    return saved ? JSON.parse(saved) : [];
    });
  const [creating, setCreating] = useState(false);
  const [worldName, setWorldName] = useState("");

  useEffect(() => {
    localStorage.setItem("dnd_worlds", JSON.stringify(worlds));
  }, [worlds]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = worldName.trim();
    if (!name) return;
    setWorlds([...worlds, name]);
    setWorldName("");
    setCreating(false);
  };

  return (
    <Center>
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 400 }}>
        {worlds.map((world) => (
          <Button key={world} variant="contained">
            {world}
          </Button>
        ))}
        {creating ? (
          <form onSubmit={handleSubmit}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                label="World Name"
                value={worldName}
                onChange={(e) => setWorldName(e.target.value)}
              />
              <Button type="submit" variant="contained">
                Submit
              </Button>
            </Stack>
          </form>
        ) : (
          <Button variant="contained" onClick={() => setCreating(true)}>
            Create New World
          </Button>
        )}
      </Stack>
    </Center>
  );
}
