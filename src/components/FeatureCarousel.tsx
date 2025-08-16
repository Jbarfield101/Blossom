
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "@mui/material";
import {
  FaMusic,
  FaCubes,
  FaCameraRetro,
  FaRobot,
  FaBolt,
  FaCalendarAlt,
  FaDiceD20,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../features/settings/useSettings";

import type { ModuleKey } from "../features/settings/useSettings";

type Item = { key: ModuleKey; icon: ReactNode; label: string; path: string };
export default function FeatureCarousel({
  onHoverColor,
}: { onHoverColor: (c: string) => void }) {
  const nav = useNavigate();
  const { modules } = useSettings();

  const ACCENT = "#00bcd4";

  const items: Item[] = useMemo(
    () => [
      { key: "objects", icon: <FaCubes />, label: "3D Object", path: "/objects" },
      { key: "music", icon: <FaMusic />, label: "Lo‑Fi Music", path: "/music" },
      { key: "calendar", icon: <FaCalendarAlt />, label: "Calendar", path: "/calendar" },
      { key: "comfy", icon: <FaCameraRetro />, label: "ComfyUI", path: "/comfy" },
      { key: "assistant", icon: <FaRobot />, label: "AI Assistant", path: "/assistant" },
      { key: "laser", icon: <FaBolt />, label: "Laser Lab", path: "/laser" },
      { key: "dnd", icon: <FaDiceD20 />, label: "DND", path: "/dnd" },
    ],
    []
  );
  const enabled = items.filter((it) => modules[it.key]);

  // index of the centered item
  const [i, setI] = useState(0);
  const len = enabled.length;
  const mod = (n:number, m:number) => ((n % m) + m) % m;

  const go = (dir: 1 | -1) => setI(v => mod(v + dir, len));

  useEffect(() => {
    if (i >= len) setI(0);
  }, [len, i]);

  const wheelLock = useRef(0);
  // scroll with mouse wheel (throttle to one item per tick)
  const onWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - wheelLock.current < 200) return;
    wheelLock.current = now;
    if (Math.abs(e.deltaY) < 5 && Math.abs(e.deltaX) < 5) return;
    go(e.deltaY > 0 || e.deltaX > 0 ? 1 : -1);
  };

  // layout constants
  const GAP = 140; // distance between items
  const SCALE_MID = 1.05; // center scale
  const SCALE_SIDE = 0.7; // side scale

  return (
    <div
      onWheel={onWheel}
      style={{
        height: "100vh",
        display: "grid",
        placeItems: "center",
        position: "relative",
        overflow: "hidden",
        zIndex: 1
      }}
    >
      {/* items */}
      <div style={{ position: "relative", width: "100%", height: 240 }}>
        {len > 0 && [-2, -1, 0, 1, 2].map((offset) => {
          const idx = mod(i + offset, len);
          const it = enabled[idx];
          const center = offset === 0;
          const x = offset * GAP;

          return (
            <div
              key={`${idx}-${offset}`}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translateX(${x}px) scale(${center ? SCALE_MID : SCALE_SIDE})`,
                transition: "transform 280ms ease, opacity 280ms ease, color 180ms ease",
                textAlign: "center",
                opacity: center ? 1 : 0.6,
                userSelect: "none",
                width: 180,
              }}
            >
              <IconButton
                sx={{
                  fontSize: "3rem",
                  color: center ? ACCENT : "white",
                  boxShadow: center ? `0 0 20px 6px ${ACCENT}55` : "none",
                  transition:
                    "transform 280ms ease, color 180ms ease, box-shadow 180ms ease",
                  "&:hover": {
                    color: ACCENT,
                    transform: "scale(1.05)",
                    boxShadow: `0 0 20px 6px ${ACCENT}55`,
                  },
                }}
                onMouseEnter={() => onHoverColor(`${ACCENT}55`)}
                onMouseLeave={() => onHoverColor("rgba(255,255,255,0.22)")}
                onClick={() => (center ? nav(it.path) : setI(idx))}
                aria-label={it.label}
              >
                {it.icon}
              </IconButton>
              <div
                style={{
                  color: center ? ACCENT : "white",
                  marginTop: 12,
                  fontSize: 14,
                }}
              >
                {it.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
