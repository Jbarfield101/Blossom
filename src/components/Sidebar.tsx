import { Box, IconButton, Tooltip } from "@mui/material";
import { useState } from "react";
import {
  FaMusic,
  FaDiceD20,
  FaCog,
  FaBrain,
  FaDatabase,
  FaProjectDiagram,
} from "react-icons/fa";
import ErrorBoundary from "./ErrorBoundary";
import SettingsDrawer from "./SettingsDrawer";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const items = [
    { label: "Music Generator", icon: <FaMusic /> },
    { label: "D&D", icon: <FaDiceD20 /> },
    { label: "Settings", icon: <FaCog />, onClick: () => setOpen(true) },
    { label: "Train Model", icon: <FaBrain /> },
    { label: "Manage Models", icon: <FaDatabase /> },
    { label: "ONNX Crafter", icon: <FaProjectDiagram /> },
  ];
  return (
    <>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
          p: 1,
          zIndex: 2,
        }}
      >
        {items.map(({ label, icon, onClick }) => (
          <Tooltip title={label} placement="right" key={label}>
            <IconButton
              aria-label={label}
              onClick={onClick}
              sx={(theme) => ({
                color: theme.palette.text.primary,
                "&:hover": { color: theme.palette.primary.main },
              })}
            >
              {icon}
            </IconButton>
          </Tooltip>
        ))}
      </Box>
      <ErrorBoundary>
        <SettingsDrawer open={open} onClose={() => setOpen(false)} />
      </ErrorBoundary>
    </>
  );
}
