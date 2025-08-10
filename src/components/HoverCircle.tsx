import { useEffect, useState } from "react";

export default function HoverCircle({ color="rgba(255,255,255,0.22)" }:{ color?: string }) {
  const [pos, setPos] = useState({ x: -200, y: -200 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: pos.y - 60,
        left: pos.x - 60,
        width: 120,
        height: 120,
        borderRadius: "50%",
        background: color,
        filter: "blur(28px)",
        pointerEvents: "none",
        transition: "background 200ms ease",
        zIndex: 0
      }}
    />
  );
}
