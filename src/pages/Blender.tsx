import { useState } from "react";
import { TextField, Button, Stack } from "@mui/material";
import Center from "./_Center";
import { invoke } from "@tauri-apps/api/core";

export default function Blender() {
  const [code, setCode] = useState("import bpy\n\n# example cube\nbpy.ops.mesh.primitive_cube_add()");
  const [status, setStatus] = useState<string | null>(null);

  const run = async () => {
    setStatus("Running...");
    try {
      await invoke("blender_run_script", { code });
      setStatus("Blender finished running");
    } catch (e) {
      setStatus("Error: " + e);
    }
  };

  return (
    <Center>
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 600 }}>
        <TextField
          label="Blender bpy code"
          multiline
          minRows={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Button variant="contained" onClick={run}>Run in Blender</Button>
        {status && <div>{status}</div>}
      </Stack>
    </Center>
  );
}
