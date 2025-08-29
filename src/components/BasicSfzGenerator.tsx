import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readDir } from "@tauri-apps/api/fs";
import { resolveResource } from "@tauri-apps/api/path";
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { useTasks } from "../store/tasks";

interface Option {
  label: string;
  path: string;
}

const KEYS = [
  { value: "C", label: "C" },
  { value: "C#", label: "C#/Db" },
  { value: "D", label: "D" },
  { value: "D#", label: "D#/Eb" },
  { value: "E", label: "E" },
  { value: "F", label: "F" },
  { value: "F#", label: "F#/Gb" },
  { value: "G", label: "G" },
  { value: "G#", label: "G#/Ab" },
  { value: "A", label: "A" },
  { value: "A#", label: "A#/Bb" },
  { value: "B", label: "B" },
];

export default function BasicSfzGenerator() {
  const [options, setOptions] = useState<Option[]>([]);
  const [instrument, setInstrument] = useState("");
  const [tempo, setTempo] = useState(120);
  const [key, setKey] = useState("C");
  const [outDir, setOutDir] = useState("");
  const tasks = useTasks();

  useEffect(() => {
    async function init() {
      const base = await resolveResource("sfz_sounds");
      const entries = await readDir(base);
      const files = entries
        .filter((e) => e.name?.endsWith(".sfz"))
        .map((e) => ({ label: e.name!, path: e.path }));
      setOptions(files);
      const storedInst = localStorage.getItem("basicSfzInstrument");
      if (storedInst && files.some((f) => f.path === storedInst)) {
        setInstrument(storedInst);
      } else if (files[0]) {
        setInstrument(files[0].path);
      }
      const storedDir = localStorage.getItem("basicSfzOutDir");
      if (storedDir) setOutDir(storedDir);
    }
    init();
  }, []);

  useEffect(() => {
    if (instrument) localStorage.setItem("basicSfzInstrument", instrument);
  }, [instrument]);

  useEffect(() => {
    if (outDir) localStorage.setItem("basicSfzOutDir", outDir);
  }, [outDir]);

  async function pickFolder() {
    const dir = await openDialog({ directory: true, multiple: false });
    if (dir) setOutDir(dir as string);
  }

  function generate() {
    if (!instrument || !outDir) return;
    tasks.enqueueTask("Music Generation", {
      id: "GenerateSong",
      spec: {
        title: "Basic",
        outDir,
        bpm: tempo,
        key,
        sfz_instrument: instrument,
      },
    });
  }

  return (
    <Stack spacing={2}>
      <FormControl fullWidth>
        <InputLabel id="instrument-label">Instrument</InputLabel>
        <Select
          labelId="instrument-label"
          value={instrument}
          label="Instrument"
          onChange={(e) => setInstrument(e.target.value as string)}
        >
          {options.map((o) => (
            <MenuItem key={o.path} value={o.path}>
              {o.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        type="number"
        label="Tempo"
        value={tempo}
        onChange={(e) => setTempo(Number(e.target.value))}
        fullWidth
      />
      <FormControl fullWidth>
        <InputLabel id="key-label">Key</InputLabel>
        <Select
          labelId="key-label"
          value={key}
          label="Key"
          onChange={(e) => setKey(e.target.value as string)}
        >
          {KEYS.map((k) => (
            <MenuItem key={k.value} value={k.value}>
              {k.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Stack direction="row" spacing={2}>
        <TextField
          label="Output Folder"
          value={outDir}
          InputProps={{ readOnly: true }}
          fullWidth
        />
        <Button variant="outlined" onClick={pickFolder}>
          Browse
        </Button>
      </Stack>
      <Button
        variant="contained"
        onClick={generate}
        disabled={!instrument || !outDir}
      >
        Generate
      </Button>
    </Stack>
  );
}

