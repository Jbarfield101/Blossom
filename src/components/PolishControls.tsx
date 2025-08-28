import React from "react";
import HelpIcon from "./HelpIcon";
import styles from "./SongForm.module.css";
import clsx from "clsx";

interface Props {
  hqStereo: boolean;
  setHqStereo: (val: boolean) => void;
  hqReverb: boolean;
  setHqReverb: (val: boolean) => void;
  hqSidechain: boolean;
  setHqSidechain: (val: boolean) => void;
  hqChorus: boolean;
  setHqChorus: (val: boolean) => void;
  limiterDrive: number;
  setLimiterDrive: (val: number) => void;
  dither: boolean;
  setDither: (val: boolean) => void;
  lofiFilter: boolean;
  setLofiFilter: (val: boolean) => void;
  sfzInstrument: string | null;
  pickSfzInstrument: () => void;
  loadAcousticGrand: () => void;
}

export default function PolishControls({
  hqStereo,
  setHqStereo,
  hqReverb,
  setHqReverb,
  hqSidechain,
  setHqSidechain,
  hqChorus,
  setHqChorus,
  limiterDrive,
  setLimiterDrive,
  dither,
  setDither,
  lofiFilter,
  setLofiFilter,
  sfzInstrument,
  pickSfzInstrument,
  loadAcousticGrand,
}: Props) {
  return (
    <div className={clsx(styles.panel, "mt-3")}>
      <details open data-testid="sfz-section">
          <summary className="cursor-pointer text-xs opacity-80">
            Polish <HelpIcon text="Optional mix polish effects" />
          </summary>
        <div className="mt-2">
          <div className="mt-2 flex items-center gap-2">
            <button className={styles.btn} onClick={pickSfzInstrument}>
              Choose SFZ
            </button>
            <button className={styles.btn} onClick={loadAcousticGrand}>
              Acoustic Grand Piano
            </button>
            <span className={styles.small}>
              {sfzInstrument
                ? sfzInstrument.split(/[\\/]/).pop()
                : "none selected"}
            </span>
          </div>
          <div className={styles.optionGrid}>
            <label className={styles.optionCard}>
              <span>
                Stereo widen
                <HelpIcon text="Expands stereo field (default off)" />
              </span>
              <input
                type="checkbox"
                checked={hqStereo}
                onChange={(e) => setHqStereo(e.target.checked)}
              />
            </label>
            <label className={styles.optionCard}>
              <span>
                Room reverb
                <HelpIcon text="Adds small-room ambience (default off)" />
              </span>
              <input
                type="checkbox"
                checked={hqReverb}
                onChange={(e) => setHqReverb(e.target.checked)}
              />
            </label>
            <label className={styles.optionCard}>
              <span>
                Sidechain (kick)
                <HelpIcon text="Pump mix with kick drum (default off)" />
              </span>
              <input
                type="checkbox"
                checked={hqSidechain}
                onChange={(e) => setHqSidechain(e.target.checked)}
              />
            </label>
            <label className={styles.optionCard}>
              <span>
                Chorus
                <HelpIcon text="Adds gentle chorus effect (default off)" />
              </span>
              <input
                type="checkbox"
                checked={hqChorus}
                onChange={(e) => setHqChorus(e.target.checked)}
              />
            </label>
            <label className={styles.optionCard}>
              <span>
                Lofi Filter
                <HelpIcon text="Applies lofi low-pass filter (default off)" />
              </span>
              <input
                type="checkbox"
                checked={lofiFilter}
                onChange={(e) => setLofiFilter(e.target.checked)}
              />
            </label>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs opacity-80">
              Advanced
            </summary>
            <div className="mt-2">
              <label className={styles.label}>
                Limiter Drive
                <HelpIcon text="Limiter saturation amount (1.00 neutral)" />
              </label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.01}
                value={limiterDrive}
                onChange={(e) => setLimiterDrive(Number(e.target.value))}
                className={styles.slider}
              />
              <div className={styles.small}>{limiterDrive.toFixed(2)}× saturation</div>
              <label className={clsx(styles.toggle, "mt-2")}>
                <input
                  type="checkbox"
                  checked={dither}
                  onChange={(e) => setDither(e.target.checked)}
                />
                <span className={styles.small}>
                  Dither
                  <HelpIcon text="Adds subtle noise for smoother export (default off)" />
                </span>
              </label>
            </div>
          </details>
        </div>
      </details>
    </div>
  );
}
