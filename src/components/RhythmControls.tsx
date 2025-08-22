import React from "react";
import HelpIcon from "./HelpIcon";
import styles from "./SongForm.module.css";
import clsx from "clsx";

interface Props {
  DRUM_PATS: string[];
  drumPattern: string;
  setDrumPattern: (val: string) => void;
  variety: number;
  setVariety: (val: number) => void;
  chordSpanBeats: number;
  setChordSpanBeats: (val: number) => void;
}

export default function RhythmControls({
  DRUM_PATS,
  drumPattern,
  setDrumPattern,
  variety,
  setVariety,
  chordSpanBeats,
  setChordSpanBeats,
}: Props) {
  return (
    <div className={styles.grid3}>
      <div className={styles.panel}>
        <label className={styles.label}>
          Drum Pattern
          <HelpIcon text="Choose a groove style or no drums" />
        </label>
        <select
          value={drumPattern}
          onChange={(e) => setDrumPattern(e.target.value)}
          className={clsx(styles.input, "py-2 px-3")}
        >
          {DRUM_PATS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className={styles.small}>Choose a groove or leave random.</div>
      </div>

      <div className={styles.panel}>
        <label className={styles.label}>
          Variety (0-100%)
          <HelpIcon text="Amount of fills and swing" />
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={variety}
          onChange={(e) => setVariety(Number(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.small}>{variety}% fills & swing</div>
      </div>

      <div className={styles.panel}>
        <label className={styles.label}>
          Chord Span
          <HelpIcon text="Number of beats each chord lasts" />
        </label>
        <select
          value={chordSpanBeats}
          onChange={(e) => setChordSpanBeats(Number(e.target.value))}
          className={clsx(styles.input, "py-2 px-3")}
        >
          <option value={2}>½ bar</option>
          <option value={4}>1 bar</option>
          <option value={8}>2 bars</option>
        </select>
      </div>
    </div>
  );
}
