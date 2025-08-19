
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconButton, Box } from "@mui/material";
import {
  FaMusic,
  FaCubes,
  FaCameraRetro,
  FaRobot,
  FaBolt,
  FaCalendarAlt,
  FaDiceD20,
  FaChartLine,
  FaFilm,
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
      { key: "stocks", icon: <FaChartLine />, label: "Stocks", path: "/stocks" },
      { key: "shorts", icon: <FaFilm />, label: "Shorts", path: "/shorts" },
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
    if (Math.abs(e.deltaY) < 5) return;
    go(e.deltaY > 0 ? 1 : -1);
  };

  // layout constants
  const GAP = 140; // distance between items
  const SCALE_MID = 1.05; // center scale
  const SCALE_SIDE = 0.7; // side scale

    return (
      <Box onWheel={onWheel} sx={carouselContainerSx}>
        {/* items */}
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
                  onClick={() => (center ? nav(it.path) : setI(idx))}
                  aria-label={it.label}
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
