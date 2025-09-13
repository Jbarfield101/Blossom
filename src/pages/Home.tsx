// src/pages/Home.tsx
import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import Countdown from "../components/Countdown";
import { useCalendar } from "../features/calendar/useCalendar";
import HoverCircle from "../components/HoverCircle";
import FeatureNav from "../components/FeatureNav";
import VersionBadge from "../components/VersionBadge";
import { Theme, useTheme } from "../features/theme/ThemeContext";
import HomeChat from "../components/HomeChat";
import SystemInfoWidget from "../components/SystemInfoWidget";
import TasksWidget from "../components/TasksWidget";
import { useSettings } from "../features/settings/useSettings";
import BackButton from "../components/BackButton";
import {
  countdownContainerSx,
  countdownTextSx,
  versionBadgeContainerSx,
  systemInfoWidgetSx,
  tasksWidgetSx,
} from "./homeStyles";

export default function Home() {
  const { theme } = useTheme();
  const { widgets } = useSettings();
  const themeColors: Record<Theme, string> = {
    default: "rgba(255,255,255,0.22)",
    forest: "rgba(0,255,150,0.22)",
    sunset: "rgba(255,150,0,0.22)",
    sakura: "rgba(255,150,200,0.22)",
    studio: "rgba(0,255,255,0.22)",
    galaxy: "rgba(150,200,255,0.22)",
    retro: "rgba(0,255,0,0.22)",
    noir: "rgba(50,50,50,0.22)",
    aurora: "rgba(150,255,210,0.22)",
    rainy: "rgba(0,120,255,0.22)",
    pastel: "rgba(255,182,193,0.22)",
    mono: "rgba(128,128,128,0.22)",
    eclipse: "rgba(255,204,0,0.22)",
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
      <BackButton />
      {event && (
        <Box sx={countdownContainerSx}>
          <Box sx={countdownTextSx}>
            <strong>{event.title}:</strong> <Countdown target={event.date} />
          </Box>
        </Box>
      )}
      {/* Top-center app title and version */}
      <Box sx={versionBadgeContainerSx}>
        <VersionBadge />
      </Box>

      {/* Background hover effect */}
      <HoverCircle color={hoverColor} />

      {/* Carousel icons */}
      <FeatureNav onHoverColor={setHoverColor} />

      {/* Floating chat box */}
      {widgets.homeChat && <HomeChat />}

      {/* System info widget */}
      {widgets.systemInfo && (
        <Box sx={systemInfoWidgetSx}>
          <SystemInfoWidget />
        </Box>
      )}

      {/* Tasks widget */}
      {widgets.tasks && (
        <Box sx={tasksWidgetSx}>
          <TasksWidget />
        </Box>
      )}
    </>
  );
}
