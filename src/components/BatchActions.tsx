import React from "react";
import HelpIcon from "./HelpIcon";
import styles from "./SongForm.module.css";
import clsx from "clsx";

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
    <>
      <div className={styles.grid2}>
        {!albumMode && (
          <div className={styles.panel}>
            <label className={styles.label}>
              How many songs?
              <HelpIcon text="Number of songs to render in this batch" />
            </label>
            <input
              type="number"
              min={1}
              value={numSongs}
              onChange={(e) =>
                setNumSongs(Math.max(1, Number(e.target.value || 1)))
              }
              className={styles.input}
            />
            <div className={clsx(styles.small, "mt-2")}>
              Titles will be suffixed with{" "}
              <select
                value={titleSuffixMode}
                onChange={(e) => setTitleSuffixMode(e.target.value)}
                className={clsx(
                  styles.input,
                  "py-1 px-2 inline-block w-[160px] ml-1"
                )}
              >
                <option value="number"># (1, 2, 3…)</option>
                <option value="timestamp">timestamp</option>
              </select>
            </div>
          </div>
        )}

        <div className={styles.panel}>
          <label className={styles.label}>
            BPM Jitter (0-30%, per song)
            <HelpIcon text="Random tempo variation around base BPM" />
          </label>
          <input
            type="range"
            min={0}
            max={30}
            value={bpmJitterPct}
            onChange={(e) => setBpmJitterPct(Number(e.target.value))}
            className={styles.slider}
          />
          <div className={styles.small}>±{bpmJitterPct}% around the base BPM</div>
          <div className={clsx(styles.toggle, "mt-2") }>
            <input
              type="checkbox"
              checked={playLast}
              onChange={(e) => setPlayLast(e.target.checked)}
            />
            <span className={styles.small}>Auto‑play last successful render</span>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.btn}
          disabled={
            busy ||
            !outDir ||
            !titleBase ||
            (albumMode && !albumReady)
          }
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

        <div className={styles.row}>
          <button className={styles.playBtn} onClick={onPreview}>
            {previewPlaying ? "Stop preview" : "Preview snippet"}
          </button>
          <HelpIcon text="Play a quick 5-second preview" />
        </div>

        <button className={styles.playBtn} onClick={onPlayLastTrack}>
          {isPlaying ? "Pause" : "Play last track"}
        </button>
      </div>
    </>
  );
}
