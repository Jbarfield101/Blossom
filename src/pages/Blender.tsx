import { useState } from "react";
import { TextField, Button, Stack } from "@mui/material";
import Center from "./_Center";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export default function Blender() {
  const [code, setCode] = useState("import bpy\n\n# example cube\nbpy.ops.mesh.primitive_cube_add()");
  const [status, setStatus] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState<string | null>(null);

  const selectOutput = async () => {
    const selected = await open({ directory: true });
    if (typeof selected === "string") {
      setOutputDir(selected);
    }
  };

  const run = async () => {
    setStatus("Running...");
    try {
      const script =
        outputDir
          ? `${code}\n\nbpy.ops.wm.save_mainfile(filepath='${outputDir.replace(/\\/g, "/")}/output.blend')`
          : code;
      await invoke("blender_run_script", { code: script });
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
        <Button variant="outlined" onClick={selectOutput}>
          Select Output Folder
        </Button>
        <Button variant="contained" onClick={run}>Run in Blender</Button>
        {outputDir && <div>Selected Output Folder: {outputDir}</div>}
        {status && <div>{status}</div>}
      </Stack>
    </Center>
  );
}
