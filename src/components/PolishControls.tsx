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
}: Props) {
  return (
    <div className={clsx(styles.panel, "mt-3")}>
      <details open>
        <summary className="cursor-pointer text-xs opacity-80">
          Polish <HelpIcon text="Optional mix polish effects" />
        </summary>
        <div className="mt-2">
          <div className={styles.optionGrid}>
            <label className={styles.optionCard}>
              <span>Stereo widen</span>
              <input
                type="checkbox"
                checked={hqStereo}
                onChange={(e) => setHqStereo(e.target.checked)}
              />
            </label>
            <label className={styles.optionCard}>
              <span>Room reverb</span>
              <input
                type="checkbox"
                checked={hqReverb}
                onChange={(e) => setHqReverb(e.target.checked)}
              />
            </label>
            <label className={styles.optionCard}>
              <span>Sidechain (kick)</span>
              <input
                type="checkbox"
                checked={hqSidechain}
                onChange={(e) => setHqSidechain(e.target.checked)}
              />
            </label>
            <label className={styles.optionCard}>
              <span>Chorus</span>
              <input
                type="checkbox"
                checked={hqChorus}
                onChange={(e) => setHqChorus(e.target.checked)}
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
                <HelpIcon text="Amount of saturation added by the limiter" />
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
              <div className={clsx(styles.toggle, "mt-2")}>
                <input
                  type="checkbox"
                  checked={dither}
                  onChange={(e) => setDither(e.target.checked)}
                />
                <span className={styles.small}>Dither</span>
              </div>
            </div>
          </details>
        </div>
      </details>
    </div>
  );
}
