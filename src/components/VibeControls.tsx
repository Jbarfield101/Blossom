import React from "react";
import HelpIcon from "./HelpIcon";
import styles from "./SongForm.module.css";

interface Props {
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
  setAmbience: (updater: (prev: string[]) => string[]) => void;
  ambienceLevel: number;
  setAmbienceLevel: (val: number) => void;
}

function toggle(list: string[], val: string) {
  return list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
}

export default function VibeControls({
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
    <div className={styles.grid3}>
      <div className={styles.panel}>
        <label className={styles.label}>
          Mood
          <HelpIcon text="Tags describing the vibe" />
        </label>
        <div className={styles.optionGrid}>
          {MOODS.map((m) => (
            <label key={m} className={styles.optionCard}>
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

      <div className={styles.panel}>
        <label className={styles.label}>
          Instruments
          <HelpIcon text="Select instruments to include" />
        </label>
        <div className={styles.optionGrid}>
          {INSTR.map((i) => (
            <label key={i} className={styles.optionCard}>
              <span>{i}</span>
              <input
                type="checkbox"
                checked={instruments.includes(i)}
                onChange={() => setInstruments((prev) => toggle(prev, i))}
              />
            </label>
          ))}
        </div>
        <div className={styles.small}>Drums are synthesized automatically.</div>
      </div>

      <div className={styles.panel}>
        <label className={styles.label}>
          Lead Instrument
          <HelpIcon text="Choose the instrument that carries the main melody" />
        </label>
        <div className={styles.optionGrid}>
          {LEAD_INSTR.map((l) => (
            <label key={l.value} className={styles.optionCard}>
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

      <div className={styles.panel}>
        <label className={styles.label}>
          Ambience
          <HelpIcon text="Background ambience sounds" />
        </label>
        <div className={styles.optionGrid}>
          {AMBI.map((a) => (
            <label key={a} className={styles.optionCard}>
              <span>{a}</span>
              <input
                type="checkbox"
                checked={ambience.includes(a)}
                onChange={() => setAmbience((prev) => toggle(prev, a))}
              />
            </label>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={ambienceLevel}
          onChange={(e) => setAmbienceLevel(Number(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.small}>{Math.round(ambienceLevel * 100)}% intensity</div>
      </div>
    </div>
  );
}
