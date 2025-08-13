// src/pages/Home.tsx
import { useState } from "react";
import Countdown from "../components/Countdown";
import { useCalendar } from "../features/calendar/useCalendar";
import HoverCircle from "../components/HoverCircle";
import FeatureCarousel from "../components/FeatureCarousel";
import VersionBadge from "../components/VersionBadge";
import { useTheme } from "../theme";

export default function Home() {
  const [hoverColor, setHoverColor] = useState("rgba(255,255,255,0.22)");
  const { events, selectedCountdownId } = useCalendar();
  const countdownEvents = events.filter((e) => e.hasCountdown);
  const { accent } = useTheme();
  let event = null as typeof countdownEvents[number] | null;
  if (selectedCountdownId) {
    event = countdownEvents.find((e) => e.id === selectedCountdownId) || null;
  } else if (countdownEvents.length === 1) {
    event = countdownEvents[0];
  }

  return (
    <>
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
          color: "var(--text)",
        }}
      >
        <VersionBadge />
        {event && (
          <div
            style={{
              marginTop: 4,
              fontSize: 14,
              display: "inline-block",
              padding: "2px 10px",
              borderRadius: 12,
              background: "rgba(0,0,0,0.35)",
              color: accent,
            }}
          >
            <strong>{event.title}:</strong> <Countdown target={event.date} />
          </div>
        )}
      </div>

      {/* Background hover effect */}
      <HoverCircle color={hoverColor} />

      {/* Carousel icons */}
      <FeatureCarousel onHoverColor={setHoverColor} />
    </>
  );
}
