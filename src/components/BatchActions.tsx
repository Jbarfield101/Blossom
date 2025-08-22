import React from "react";
import HelpIcon from "./HelpIcon";

interface Props {
  S: Record<string, React.CSSProperties>;
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
  hasInvalidBars: boolean;
  albumMode: boolean;
  onRender: () => void;
  previewPlaying: boolean;
  onPreview: () => Promise<void> | void;
  isPlaying: boolean;
  onPlayLastTrack: () => Promise<void> | void;
}

export default function BatchActions({
  S,
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
  hasInvalidBars,
  albumMode,
  onRender,
  previewPlaying,
  onPreview,
  isPlaying,
  onPlayLastTrack,
}: Props) {
  return (
    <>
      <div style={S.grid2}>
        <div style={S.panel}>
          <label style={S.label}>
            How many songs?
            <HelpIcon text="Number of songs to render in this batch" />
          </label>
          <input
            type="number"
            min={1}
            value={numSongs}
            onChange={(e) => setNumSongs(Math.max(1, Number(e.target.value || 1)))}
            style={S.input}
          />
          <div style={{ ...S.small, marginTop: 8 }}>
            Titles will be suffixed with{" "}
            <select
              value={titleSuffixMode}
              onChange={(e) => setTitleSuffixMode(e.target.value)}
              style={{
                ...S.input,
                padding: "4px 8px",
                display: "inline-block",
                width: 160,
                marginLeft: 6,
              }}
            >
              <option value="number"># (1, 2, 3…)</option>
              <option value="timestamp">timestamp</option>
            </select>
          </div>
        </div>

        <div style={S.panel}>
          <label style={S.label}>
            BPM Jitter (per song)
            <HelpIcon text="Random tempo variation around base BPM" />
          </label>
          <input
            type="range"
            min={0}
            max={30}
            value={bpmJitterPct}
            onChange={(e) => setBpmJitterPct(Number(e.target.value))}
            style={S.slider}
          />
          <div style={S.small}>±{bpmJitterPct}% around the base BPM</div>
          <div style={{ ...S.toggle, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={playLast}
              onChange={(e) => setPlayLast(e.target.checked)}
            />
            <span style={S.small}>Auto‑play last successful render</span>
          </div>
        </div>
      </div>

      <div style={S.actions}>
        <button
          style={S.btn}
          disabled={busy || !outDir || !titleBase || hasInvalidBars}
          onClick={onRender}
        >
          {albumMode
            ? busy
              ? "Creating album…"
              : "Create Album"
            : busy
            ? "Rendering batch…"
            : "Render Songs"}
        </button>

        <button style={S.playBtn} onClick={onPreview}>
          {previewPlaying ? "Stop preview" : "Preview in browser"}
        </button>

        <button style={S.playBtn} onClick={onPlayLastTrack}>
          {isPlaying ? "Pause" : "Play last track"}
        </button>
      </div>
    </>
  );
}
