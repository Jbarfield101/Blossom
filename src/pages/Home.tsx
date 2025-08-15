// src/pages/Home.tsx
import { useEffect, useState } from "react";
import Countdown from "../components/Countdown";
import { useCalendar } from "../features/calendar/useCalendar";
import HoverCircle from "../components/HoverCircle";
import FeatureCarousel from "../components/FeatureCarousel";
import VersionBadge from "../components/VersionBadge";
import { Theme, useTheme } from "../features/theme/ThemeContext";

export default function Home() {
  const { theme } = useTheme();
  const themeColors: Record<Theme, string> = {
    default: "rgba(255,255,255,0.22)",
    ocean: "rgba(0,150,255,0.22)",
    forest: "rgba(0,255,150,0.22)",
    sunset: "rgba(255,150,0,0.22)",
    sakura: "rgba(255,150,200,0.22)",
  };
  const [hoverColor, setHoverColor] = useState(themeColors[theme]);
  useEffect(() => {
    setHoverColor(themeColors[theme]);
  }, [theme]);
  const { events, selectedCountdownId } = useCalendar();
  const countdownEvents = events.filter(
    (e) => e.hasCountdown && e.status !== "canceled" && e.status !== "missed"
  );
  let event = null as typeof countdownEvents[number] | null;
  if (selectedCountdownId) {
    event = countdownEvents.find((e) => e.id === selectedCountdownId) || null;
  } else if (countdownEvents.length === 1) {
    event = countdownEvents[0];
  }

  return (
    <>
      {event && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 50,
            color: "#fff",
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: 14 }}>
            <strong>{event.title}:</strong> <Countdown target={event.date} />
          </div>
        </div>
      )}
      {/* Top-center app title and version */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
          pointerEvents: "none",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <VersionBadge />
      </div>

      {/* Background hover effect */}
      <HoverCircle color={hoverColor} />

      {/* Carousel icons */}
      <FeatureCarousel onHoverColor={setHoverColor} />
    </>
  );
}
