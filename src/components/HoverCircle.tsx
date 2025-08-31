import { useEffect, useState } from "react";
import { useAudioLevel } from "../utils/useAudioLevel";

export default function HoverCircle({
  color = "rgba(255,255,255,0.22)",
}: {
  color?: string;
}) {
  const [pos, setPos] = useState({ x: -200, y: -200 });
  const level = useAudioLevel();

  useEffect(() => {
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const size = 120 + level * 60;
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  const r = match ? match[1] : "0";
  const g = match ? match[2] : "255";
  const b = match ? match[3] : "0";
  const baseAlpha = match && match[4] ? parseFloat(match[4]) : 0.22;
  const alpha = baseAlpha + level * (1 - baseAlpha);

  const style: React.CSSProperties & { "--audio-alpha": number } = {
    position: "fixed",
    top: pos.y - size / 2,
    left: pos.x - size / 2,
    width: size,
    height: size,
    borderRadius: "50%",
    background: `rgba(${r},${g},${b}, var(--audio-alpha))`,
    filter: "blur(28px)",
    pointerEvents: "none",
    transition: "background 200ms ease",
    zIndex: -1,
    "--audio-alpha": alpha,
  };

  return <div style={style} />;
}
