import React, { useEffect, useRef } from "react";
import { ITEMS } from "./FeatureNav";

/**
 * Displays the FeatureNav icons bouncing around inside the TV screen.
 */
export default function BouncingIcons() {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ICON_SIZE = 48;
    const positions = ITEMS.map(() => ({
      x: Math.random() * (container.clientWidth - ICON_SIZE),
      y: Math.random() * (container.clientHeight - ICON_SIZE),
      vx: (Math.random() * 1.5 + 0.5) * (Math.random() < 0.5 ? -1 : 1),
      vy: (Math.random() * 1.5 + 0.5) * (Math.random() < 0.5 ? -1 : 1),
    }));

    let frame: number;

    const animate = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      positions.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x <= 0 || p.x >= width - ICON_SIZE) p.vx *= -1;
        if (p.y <= 0 || p.y >= height - ICON_SIZE) p.vy *= -1;
        const el = iconRefs.current[i];
        if (el) {
          el.style.transform = `translate(${p.x}px, ${p.y}px)`;
        }
      });
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={containerRef}
      className="retro-tv-content"
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      {ITEMS.map((it, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) iconRefs.current[i] = el;
          }}
          style={{
            position: "absolute",
            fontSize: "2rem",
            color: it.color.replace("0.55", "1"),
          }}
        >
          {it.icon}
        </div>
      ))}
    </div>
  );
}

