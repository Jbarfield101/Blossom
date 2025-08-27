import { useEffect, useRef } from "react";
import { ITEMS } from "./FeatureNav";

export default function BouncingIcons() {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const icons = iconRefs.current;
    const positions = icons.map((el) => ({
      x: Math.random() * (container.clientWidth - el.offsetWidth),
      y: Math.random() * (container.clientHeight - el.offsetHeight),
    }));
    const velocities = icons.map(() => ({
      vx: (Math.random() * 2 - 1) * 1.5,
      vy: (Math.random() * 2 - 1) * 1.5,
    }));

    let frame: number;
    const animate = () => {
      icons.forEach((el, i) => {
        const { offsetWidth, offsetHeight } = el;
        let { x, y } = positions[i];
        let { vx, vy } = velocities[i];
        x += vx;
        y += vy;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (x <= 0 || x + offsetWidth >= w) {
          vx = -vx;
          x = Math.max(0, Math.min(w - offsetWidth, x));
        }
        if (y <= 0 || y + offsetHeight >= h) {
          vy = -vy;
          y = Math.max(0, Math.min(h - offsetHeight, y));
        }
        positions[i] = { x, y };
        velocities[i] = { vx, vy };
        el.style.transform = `translate(${x}px, ${y}px)`;
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
      style={{ position: "relative", overflow: "hidden" }}
    >
      {ITEMS.map((it, idx) => (
        <div
          key={idx}
          ref={(el) => {
            if (el) iconRefs.current[idx] = el;
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            fontSize: 40,
            color: it.color.replace("0.55", "1"),
          }}
        >
          {it.icon}
        </div>
      ))}
    </div>
  );
}

