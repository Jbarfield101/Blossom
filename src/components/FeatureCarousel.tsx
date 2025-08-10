
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { IconButton } from "@mui/material";
import {
  FaMusic, FaCubes, FaCameraRetro, FaRobot, FaBolt, FaCalendarAlt
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

type Item = { icon: ReactNode; label: string; color: string; path: string };
export default function FeatureCarousel({
  onHoverColor,
}: { onHoverColor: (c: string) => void }) {
  const nav = useNavigate();

  const items: Item[] = useMemo(() => ([
    { icon:<FaCubes/>,       label:"3D Object",    color:"rgba(165,216,255,0.55)", path:"/objects" },
    { icon:<FaMusic/>,       label:"Lo‑Fi Music",  color:"rgba(245,176,194,0.55)", path:"/music" },
    { icon:<FaCalendarAlt/>, label:"Calendar",     color:"rgba(211,200,255,0.55)", path:"/calendar" },
    { icon:<FaCameraRetro/>, label:"ComfyUI",      color:"rgba(255,213,165,0.55)", path:"/comfy" },
    { icon:<FaRobot/>,       label:"AI Assistant", color:"rgba(175,245,215,0.55)", path:"/assistant" },
    { icon:<FaBolt/>,        label:"Laser Lab",    color:"rgba(255,180,180,0.55)", path:"/laser" },
  ]), []);

  // index of the centered item
  const [i, setI] = useState(0);
  const len = items.length;
  const mod = (n:number, m:number) => ((n % m) + m) % m;

  const go = (dir: 1 | -1) => setI(v => mod(v + dir, len));

  const wheelLock = useRef(0);
  // scroll with mouse wheel (throttle to one item per tick)
  const onWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - wheelLock.current < 200) return;
    wheelLock.current = now;
    if (Math.abs(e.deltaY) < 5 && Math.abs(e.deltaX) < 5) return;
    go(e.deltaY > 0 || e.deltaX > 0 ? 1 : -1);
  };

  // hover zones (auto-advance while hovering)
  const leftTimer = useRef<number | null>(null);
  const rightTimer = useRef<number | null>(null);

  const startAuto = (dir: 1 | -1, ref: React.MutableRefObject<number | null>) => {
    if (ref.current) return;
    ref.current = window.setInterval(() => go(dir), 700);
  };
  const stopAuto = (ref: React.MutableRefObject<number | null>) => {
    if (ref.current) { clearInterval(ref.current); ref.current = null; }
  };

  // layout constants
  const GAP = 140;         // distance between items
  const SCALE_MID = 1.0;   // center scale
  const SCALE_SIDE = 0.7;  // side scale

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
      {/* LEFT hover area */}
      <div
        onMouseEnter={() => startAuto(-1, leftTimer)}
        onMouseLeave={() => stopAuto(leftTimer)}
        onClick={() => go(-1)}
        style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: "18%",
          cursor: "w-resize", zIndex: 2
        }}
        aria-label="Previous"
      />
      {/* RIGHT hover area */}
      <div
        onMouseEnter={() => startAuto(1, rightTimer)}
        onMouseLeave={() => stopAuto(rightTimer)}
        onClick={() => go(1)}
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: "18%",
          cursor: "e-resize", zIndex: 2
        }}
        aria-label="Next"
      />

      {/* items */}
      <div style={{ position: "relative", width: "100%", height: 240 }}>
        {[-2, -1, 0, 1, 2].map((offset) => {
          const idx = mod(i + offset, len);
          const it = items[idx];
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
                width: 180
              }}
            >
              <IconButton
                sx={{
                  fontSize: "3.5rem",
                  color: "white",
                  "&:hover": {
                    color: it.color.replace("0.55", "1"),
                    transform: "scale(1.06)",
                    filter: "drop-shadow(0 8px 18px rgba(0,0,0,.18))"
                  },
                }}
                onMouseEnter={() => onHoverColor(it.color)}
                onMouseLeave={() => onHoverColor("rgba(255,255,255,0.22)")}
                onClick={() => center ? nav(it.path) : setI(idx)}
                aria-label={it.label}
              >
                {it.icon}
              </IconButton>
              <div style={{ color: "white", marginTop: 8, fontSize: 14 }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
