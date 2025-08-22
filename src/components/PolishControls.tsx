import React from "react";
import HelpIcon from "./HelpIcon";

interface Props {
  S: Record<string, React.CSSProperties>;
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
  S,
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
    <div style={{ ...S.panel, marginTop: 12 }}>
      <details open>
        <summary style={{ cursor: "pointer", fontSize: 12, opacity: 0.8 }}>
          Polish <HelpIcon text="Optional mix polish effects" />
        </summary>
        <div style={{ marginTop: 8 }}>
          <div style={S.optionGrid}>
            <label style={S.optionCard}>
              <span>Stereo widen</span>
              <input
                type="checkbox"
                checked={hqStereo}
                onChange={(e) => setHqStereo(e.target.checked)}
              />
            </label>
            <label style={S.optionCard}>
              <span>Room reverb</span>
              <input
                type="checkbox"
                checked={hqReverb}
                onChange={(e) => setHqReverb(e.target.checked)}
              />
            </label>
            <label style={S.optionCard}>
              <span>Sidechain (kick)</span>
              <input
                type="checkbox"
                checked={hqSidechain}
                onChange={(e) => setHqSidechain(e.target.checked)}
              />
            </label>
            <label style={S.optionCard}>
              <span>Chorus</span>
              <input
                type="checkbox"
                checked={hqChorus}
                onChange={(e) => setHqChorus(e.target.checked)}
              />
            </label>
          </div>
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer", fontSize: 12, opacity: 0.8 }}>
              Advanced
            </summary>
            <div style={{ marginTop: 8 }}>
              <label style={S.label}>
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
                style={S.slider}
              />
              <div style={S.small}>{limiterDrive.toFixed(2)}× saturation</div>
              <div style={{ ...S.toggle, marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={dither}
                  onChange={(e) => setDither(e.target.checked)}
                />
                <span style={S.small}>Dither</span>
              </div>
            </div>
          </details>
        </div>
      </details>
    </div>
  );
}
