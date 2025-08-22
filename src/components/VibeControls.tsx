import React from "react";
import HelpIcon from "./HelpIcon";

interface Props {
  S: Record<string, React.CSSProperties>;
  MOODS: string[];
  INSTR: string[];
  LEAD_INSTR: { value: string; label: string }[];
  AMBI: string[];
  mood: string[];
  setMood: (updater: (prev: string[]) => string[]) => void;
  instruments: string[];
  setInstruments: (updater: (prev: string[]) => string[]) => void;
  leadInstrument: string;
  setLeadInstrument: (val: string) => void;
  ambience: string[];
  setAmbience: (vals: string[]) => void;
  ambienceLevel: number;
  setAmbienceLevel: (val: number) => void;
}

function toggle(list: string[], val: string) {
  return list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
}

export default function VibeControls({
  S,
  MOODS,
  INSTR,
  LEAD_INSTR,
  AMBI,
  mood,
  setMood,
  instruments,
  setInstruments,
  leadInstrument,
  setLeadInstrument,
  ambience,
  setAmbience,
  ambienceLevel,
  setAmbienceLevel,
}: Props) {
  return (
    <div style={S.grid3}>
      <div style={S.panel}>
        <label style={S.label}>
          Mood
          <HelpIcon text="Tags describing the vibe" />
        </label>
        <div style={S.optionGrid}>
          {MOODS.map((m) => (
            <label key={m} style={S.optionCard}>
              <span>{m}</span>
              <input
                type="checkbox"
                checked={mood.includes(m)}
                onChange={() => setMood((prev) => toggle(prev, m))}
              />
            </label>
          ))}
        </div>
      </div>

      <div style={S.panel}>
        <label style={S.label}>
          Instruments
          <HelpIcon text="Select instruments to include" />
        </label>
        <div style={S.optionGrid}>
          {INSTR.map((i) => (
            <label key={i} style={S.optionCard}>
              <span>{i}</span>
              <input
                type="checkbox"
                checked={instruments.includes(i)}
                onChange={() => setInstruments((prev) => toggle(prev, i))}
              />
            </label>
          ))}
        </div>
        <div style={S.small}>Drums are synthesized automatically.</div>
      </div>

      <div style={S.panel}>
        <label style={S.label}>
          Lead Instrument
          <HelpIcon text="Main instrument for the melody" />
        </label>
        <div style={S.optionGrid}>
          {LEAD_INSTR.map((l) => (
            <label key={l.value} style={S.optionCard}>
              <span>{l.label}</span>
              <input
                type="radio"
                name="leadInstrument"
                value={l.value}
                checked={leadInstrument === l.value}
                onChange={() => setLeadInstrument(l.value)}
              />
            </label>
          ))}
        </div>
      </div>

      <div style={S.panel}>
        <label style={S.label} htmlFor="ambience-select">
          Ambience
          <HelpIcon text="Background ambience sounds" />
        </label>
        <select
          id="ambience-select"
          multiple
          value={ambience}
          onChange={(e) =>
            setAmbience(Array.from(e.target.selectedOptions).map((o) => o.value))
          }
          style={S.input}
        >
          {AMBI.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={ambienceLevel}
          onChange={(e) => setAmbienceLevel(Number(e.target.value))}
          style={S.slider}
        />
        <div style={S.small}>{Math.round(ambienceLevel * 100)}% intensity</div>
      </div>
    </div>
  );
}
