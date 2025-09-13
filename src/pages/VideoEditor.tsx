import { useState } from "react";
import {
  Stack,
  Button,
  TextField,
  LinearProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import FileOpenIcon from "@mui/icons-material/FileOpen";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import Center from "./_Center";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import BackButton from "../components/BackButton";

export default function VideoEditor() {
  const [input, setInput] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [outputName, setOutputName] = useState("looped");
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [outputPath, setOutputPath] = useState<string | null>(null);

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
      setOutputPath(path);
      setStatus(`Saved to ${path}`);
    } catch (e: any) {
      setStatus(`Error: ${e?.message || e}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Center>
      <BackButton />
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 500 }}>
        <Button variant="outlined" onClick={pickInput}>
          Select Input Video
        </Button>
        {input && (
          <TextField
            label="Input"
            value={input}
            fullWidth
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={pickInput} edge="end">
                    <FileOpenIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ textOverflow: "ellipsis" }}
          />
        )}
        <Button variant="outlined" onClick={pickOutputDir}>
          Choose Output Folder
        </Button>
        {outputDir && (
          <TextField
            label="Output"
            value={outputDir}
            fullWidth
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={pickOutputDir} edge="end">
                    <FolderOpenIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ textOverflow: "ellipsis" }}
          />
        )}
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
        {outputPath && (
          <video
            src={convertFileSrc(outputPath)}
            controls
            loop
          />
        )}
      </Stack>
    </Center>
  );
}
