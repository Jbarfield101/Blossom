import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, IconButton } from "@mui/material";
import { getContrastColor } from "../utils/color";
import {
  FaMusic,
  FaCubes,
  FaCameraRetro,
  FaRobot,
  FaBolt,
  FaAtom,
  FaCalendarAlt,
  FaGamepad,
  FaDiceD20,
  FaMicrophone,
  FaFilm,
  FaBroom,
  FaTools,
  FaVideo,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../features/settings/useSettings";
import {
  carouselContainerSx,
  carouselItemsWrapperSx,
  carouselItemSx,
  carouselIconButtonSx,
  carouselLabelSx,
} from "./sx";
import type { ModuleKey } from "../features/settings/useSettings";

type Item = {
  key: ModuleKey;
  icon: ReactNode;
  label: string;
  path: string;
  color: string;
};

export const ITEMS: Item[] = [
  { key: "objects", icon: <FaCubes />, label: "3D Object", path: "/objects", color: "rgba(165,216,255,0.55)" },
  { key: "music", icon: <FaMusic />, label: "Music", path: "/music", color: "rgba(245,176,194,0.55)" },
  { key: "aimusic", icon: <FaRobot />, label: "AI Music", path: "/ai-music", color: "rgba(200,180,255,0.55)" },
  { key: "sfz", icon: <FaMusic />, label: "SFZ Music", path: "/sfz-music", color: "rgba(200,150,200,0.55)" },
  { key: "calendar", icon: <FaCalendarAlt />, label: "Calendar", path: "/calendar", color: "rgba(211,200,255,0.55)" },
  { key: "comfy", icon: <FaCameraRetro />, label: "ComfyUI", path: "/comfy", color: "rgba(255,213,165,0.55)" },
  { key: "assistant", icon: <FaRobot />, label: "AI Assistant", path: "/assistant", color: "rgba(175,245,215,0.55)" },
  { key: "laser", icon: <FaBolt />, label: "Laser Lab", path: "/laser", color: "rgba(255,180,180,0.55)" },
  { key: "fusion", icon: <FaAtom />, label: "Fusion", path: "/fusion", color: "rgba(255,225,100,0.55)" },
  { key: "simulation", icon: <FaGamepad />, label: "Simulation", path: "/simulation", color: "rgba(255,200,220,0.55)" },
  { key: "dnd", icon: <FaDiceD20 />, label: "D&D", path: "/dnd", color: "rgba(200,150,255,0.55)" },
  { key: "voices", icon: <FaMicrophone />, label: "Voices", path: "/voices", color: "rgba(200,240,200,0.55)" },
  { key: "shorts", icon: <FaFilm />, label: "Shorts", path: "/shorts", color: "rgba(200,200,200,0.55)" },
  { key: "chores", icon: <FaBroom />, label: "Chores", path: "/chores", color: "rgba(200,200,255,0.55)" },
  { key: "video", icon: <FaVideo />, label: "Video Editor", path: "/video-editor", color: "rgba(180,180,255,0.55)" },
  {
    key: "construction",
    icon: <FaTools />,
    label: "Under Construction",
    path: "/construction",
    color: "rgba(180,180,180,0.55)",
  },
];

export default function FeatureNav({
  onHoverColor,
  variant = "carousel",
}: {
  onHoverColor: (c: string) => void;
  variant?: "carousel" | "grid";
}) {
  const nav = useNavigate();
  const { modules } = useSettings();
  const enabled = useMemo(() => ITEMS.filter((it) => modules[it.key]), [modules]);

  if (variant === "grid") {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        gap={48}
        sx={{ height: "100vh", position: "relative", zIndex: 1, flexWrap: "wrap" }}
      >
        {enabled.map((it, i) => {
          const fullColor = it.color.replace("0.55", "1");
          const textColor = getContrastColor(fullColor);
          return (
            <div key={i} style={{ textAlign: "center" }}>
              <IconButton
                sx={{
                  fontSize: "3rem",
                  color: textColor,
                  transition: "all .2s",
                  "&:hover": {
                    color: fullColor,
                    transform: "scale(1.08)",
                    filter: "drop-shadow(0 8px 18px rgba(0,0,0,.18))",
                  },
                }}
                onMouseEnter={() => onHoverColor(it.color)}
                onMouseLeave={() => onHoverColor("rgba(255,255,255,0.22)")}
                onClick={() => {
                  localStorage.setItem("featureNavLast", it.key);
                  nav(it.path);
                }}
                aria-label={it.label}
              >
                {it.icon}
              </IconButton>
              <div style={{ color: textColor, marginTop: 8, fontSize: 14 }}>
                {it.label}
              </div>
            </div>
          );
        })}
      </Box>
    );
  }

  // carousel variant
  const ACCENT = "#00bcd4";
  const [i, setI] = useState(0);
  const len = enabled.length;
  const mod = (n: number, m: number) => ((n % m) + m) % m;
  const go = (dir: 1 | -1) => setI((v) => mod(v + dir, len));

  useEffect(() => {
    const last = localStorage.getItem("featureNavLast");
    const idx = enabled.findIndex((it) => it.key === last);
    setI(idx !== -1 ? idx : 0);
  }, [enabled]);

  useEffect(() => {
    if (i >= len) setI(0);
  }, [len, i]);

  const wheelLock = useRef(0);
  const onWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - wheelLock.current < 200) return;
    wheelLock.current = now;
    if (Math.abs(e.deltaY) < 5) return;
    go(e.deltaY > 0 ? 1 : -1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      go(-1);
    }
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      go(1);
    }
  };

  const GAP = 140;
  const SCALE_MID = 1.05;
  const SCALE_SIDE = 0.7;

  return (
    <Box
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="listbox"
      aria-activedescendant={len > 0 ? "feature-nav-active" : undefined}
      sx={carouselContainerSx}
    >
      <Box sx={carouselItemsWrapperSx}>
        {len > 0 && [-2, -1, 0, 1, 2].map((offset) => {
          const idx = mod(i + offset, len);
          const it = enabled[idx];
          const center = offset === 0;
          return (
            <Box key={`${idx}-${offset}`} sx={carouselItemSx(offset, center, GAP, SCALE_MID, SCALE_SIDE)}>
              <IconButton
                sx={carouselIconButtonSx(center, ACCENT)}
                onMouseEnter={() => onHoverColor(`${ACCENT}55`)}
                onMouseLeave={() => onHoverColor("rgba(255,255,255,0.22)")}
                onClick={() => {
                  localStorage.setItem("featureNavLast", it.key);
                  center ? nav(it.path) : setI(idx);
                }}
                aria-label={it.label}
                role="option"
                aria-selected={center}
                id={center ? "feature-nav-active" : undefined}
              >
                {it.icon}
              </IconButton>
              <Box sx={carouselLabelSx(center, ACCENT)}>{it.label}</Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

