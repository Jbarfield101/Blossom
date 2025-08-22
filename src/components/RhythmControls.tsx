import React from "react";
import HelpIcon from "./HelpIcon";

interface Props {
  S: Record<string, React.CSSProperties>;
  DRUM_PATS: string[];
  drumPattern: string;
  setDrumPattern: (val: string) => void;
  variety: number;
  setVariety: (val: number) => void;
  chordSpanBeats: number;
  setChordSpanBeats: (val: number) => void;
}

export default function RhythmControls({
  S,
  DRUM_PATS,
  drumPattern,
  setDrumPattern,
  variety,
  setVariety,
  chordSpanBeats,
  setChordSpanBeats,
}: Props) {
  return (
    <div style={S.grid3}>
      <div style={S.panel}>
        <label style={S.label}>
          Drum Pattern
          <HelpIcon text="Choose a groove style or no drums" />
        </label>
        <select
          value={drumPattern}
          onChange={(e) => setDrumPattern(e.target.value)}
          style={{ ...S.input, padding: "8px 12px" }}
        >
          {DRUM_PATS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div style={S.small}>Choose a groove or leave random.</div>
      </div>

      <div style={S.panel}>
        <label style={S.label}>
          Variety
          <HelpIcon text="Amount of fills and swing" />
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={variety}
          onChange={(e) => setVariety(Number(e.target.value))}
          style={S.slider}
        />
        <div style={S.small}>{variety}% fills & swing</div>
      </div>

      <div style={S.panel}>
        <label style={S.label}>
          Chord Span
          <HelpIcon text="Number of beats each chord lasts" />
        </label>
        <select
          value={chordSpanBeats}
          onChange={(e) => setChordSpanBeats(Number(e.target.value))}
          style={{ ...S.input, padding: "8px 12px" }}
        >
          <option value={2}>½ bar</option>
          <option value={4}>1 bar</option>
          <option value={8}>2 bars</option>
        </select>
      </div>
    </div>
  );
}
