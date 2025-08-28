import React from "react";
import HelpIcon from "./HelpIcon";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

interface Props {
  numSongs: number;
  setNumSongs: (val: number) => void;
  titleSuffixMode: string;
  setTitleSuffixMode: (val: string) => void;
  bpmJitterPct: number;
  setBpmJitterPct: (val: number) => void;
  playLast: boolean;
  setPlayLast: (val: boolean) => void;
  busy: boolean;
  outDir: string;
  titleBase: string;
  albumMode: boolean;
  albumReady: boolean;
  onRender: () => void;
  previewPlaying: boolean;
  onPreview: () => Promise<void> | void;
  isPlaying: boolean;
  onPlayLastTrack: () => Promise<void> | void;
}

export default function BatchActions({
  numSongs,
  setNumSongs,
  titleSuffixMode,
  setTitleSuffixMode,
  bpmJitterPct,
  setBpmJitterPct,
  playLast,
  setPlayLast,
  busy,
  outDir,
  titleBase,
  albumMode,
  albumReady,
  onRender,
  previewPlaying,
  onPreview,
  isPlaying,
  onPlayLastTrack,
}: Props) {
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        {!albumMode && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              How many songs?
              <HelpIcon text="Number of songs to render in this batch" />
            </Typography>
            <TextField
              type="number"
              inputProps={{ min: 1 }}
              value={numSongs}
              onChange={(e) =>
                setNumSongs(Math.max(1, Number(e.target.value || 1)))
              }
              size="small"
            />
            <Box sx={{ mt: 2, display: "flex", alignItems: "center" }}>
              <Typography variant="body2" component="span">
                Titles will be suffixed with
              </Typography>
              <TextField
                select
                value={titleSuffixMode}
                onChange={(e) => setTitleSuffixMode(e.target.value)}
                size="small"
                sx={{ width: 160, ml: 1 }}
              >
                <MenuItem value="number"># (1, 2, 3…)</MenuItem>
                <MenuItem value="timestamp">timestamp</MenuItem>
              </TextField>
            </Box>
          </Box>
        )}

        <Box>
          <Typography variant="subtitle1" gutterBottom>
            BPM Jitter (0-30%, per song)
            <HelpIcon text="Random tempo variation around base BPM" />
          </Typography>
          <Slider
            min={0}
            max={30}
            value={bpmJitterPct}
            onChange={(_, val) => setBpmJitterPct(val as number)}
          />
          <Typography variant="body2">
            ±{bpmJitterPct}% around the base BPM
          </Typography>
          <FormControlLabel
            sx={{ mt: 2 }}
            control={
              <Checkbox
                checked={playLast}
                onChange={(e) => setPlayLast(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2">
                Auto‑play last successful render
              </Typography>
            }
          />
        </Box>
      </Stack>

      <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
        <Button
          variant="contained"
          disabled={busy}
          onClick={onRender}
        >
          {albumMode
            ? busy
              ? "Creating album…"
              : "Create Album"
            : busy
            ? "Rendering batch…"
            : "Render Songs"}
        </Button>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" onClick={onPreview}>
            {previewPlaying ? "Stop preview" : "Preview snippet"}
          </Button>
          <HelpIcon text="Play a quick 5-second preview" />
        </Stack>

        <Button variant="outlined" onClick={onPlayLastTrack}>
          {isPlaying ? "Pause" : "Play last track"}
        </Button>
      </Stack>
    </Stack>
  );
}
