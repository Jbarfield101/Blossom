import { useState } from "react";
import { Stack, Button, TextField, LinearProgress } from "@mui/material";
import Center from "./_Center";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

export default function VideoEditor() {
  const [input, setInput] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [outputName, setOutputName] = useState("looped");
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const pickInput = async () => {
    const file = await open({ multiple: false });
    if (typeof file === "string") setInput(file);
  };

  const pickOutputDir = async () => {
    const dir = await open({ directory: true });
    if (typeof dir === "string") setOutputDir(dir);
  };

  const handleLoop = async () => {
    if (!input || !outputDir || !outputName.trim()) {
      setStatus("Please select input, output folder, and name.");
      return;
    }
    const total = hours * 3600 + minutes * 60 + seconds;
    if (total <= 0) {
      setStatus("Duration must be greater than 0.");
      return;
    }
    setProcessing(true);
    try {
      setStatus("Processing...");
      const path: string = await invoke("loop_video", {
        input,
        outputDir,
        outputName,
        hours,
        minutes,
        seconds,
      });
      setStatus(`Saved to ${path}`);
    } catch (e: any) {
      setStatus(`Error: ${e?.message || e}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Center>
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 500 }}>
        <Button variant="outlined" onClick={pickInput}>
          Select Input Video
        </Button>
        {input && <div>Input: {input}</div>}
        <Button variant="outlined" onClick={pickOutputDir}>
          Choose Output Folder
        </Button>
        {outputDir && <div>Output: {outputDir}</div>}
        <TextField
          label="Output Name"
          value={outputName}
          onChange={(e) => setOutputName(e.target.value)}
        />
        <Stack direction="row" spacing={1}>
          <TextField
            type="number"
            label="Hours"
            value={hours}
            onChange={(e) => setHours(Math.max(0, Number(e.target.value)))}
            inputProps={{ min: 0 }}
          />
          <TextField
            type="number"
            label="Minutes"
            value={minutes}
            onChange={(e) =>
              setMinutes(
                Math.max(0, Math.min(59, Number(e.target.value)))
              )
            }
            inputProps={{ min: 0, max: 59 }}
          />
          <TextField
            type="number"
            label="Seconds"
            value={seconds}
            onChange={(e) =>
              setSeconds(
                Math.max(0, Math.min(59, Number(e.target.value)))
              )
            }
            inputProps={{ min: 0, max: 59 }}
          />
        </Stack>
        <Button variant="contained" onClick={handleLoop} disabled={processing}>
          Create Loop
        </Button>
        {processing && <LinearProgress />}
        {status && <div>{status}</div>}
      </Stack>
    </Center>
  );
}
