import { useState } from "react";
import { Box, Drawer, IconButton, Tooltip, useMediaQuery } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { FaBars, FaHome, FaCameraRetro, FaCalendarAlt, FaTasks, FaWrench } from "react-icons/fa";
import SettingsDrawer from "./SettingsDrawer";
import TaskDrawer from "./TaskDrawer";

export default function Sidebar() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width:600px)");

  const items = [
    { label: "Home", icon: <FaHome />, onClick: () => nav("/"), path: "/" },
    { label: "ComfyUI", icon: <FaCameraRetro />, onClick: () => nav("/comfy"), path: "/comfy" },
    { label: "Calendar", icon: <FaCalendarAlt />, onClick: () => nav("/calendar"), path: "/calendar" },
    { label: "Tasks", icon: <FaTasks />, onClick: () => setTaskOpen(true) },
    { label: "Settings", icon: <FaWrench />, onClick: () => setSettingsOpen(true) },
  ];

  const renderButtons = (closeDrawer: boolean) => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        mt: 2,
      }}
    >
      {items.map((it) => (
        <Tooltip title={it.label} key={it.label}>
          <IconButton
            onClick={() => {
              it.onClick();
              if (closeDrawer) setDrawerOpen(false);
            }}
            aria-label={it.label}
            aria-current={it.path && pathname === it.path ? "page" : undefined}
            sx={
              it.path && pathname === it.path
                ? { color: "#000", backgroundColor: "#fff", borderRadius: 1 }
                : { color: "white" }
            }
          >
            {it.icon}
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  );

  return (
    <>
      {isMobile ? (
        <>
          <Tooltip title="Menu">
            <IconButton
              onClick={() => setDrawerOpen(true)}
              sx={{ position: "fixed", top: 12, left: 8, zIndex: 3, color: "white" }}
              aria-label="Menu"
              aria-expanded={drawerOpen}
            >
              <FaBars />
            </IconButton>
          </Tooltip>
          <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            PaperProps={{ sx: { width: 60, backgroundColor: "transparent" } }}
          >
            {renderButtons(true)}
          </Drawer>
        </>
      ) : (
        <Box
          sx={{
            position: "fixed",
            top: "var(--top-bar-height)",
            left: 0,
            width: 60,
            height: "calc(100vh - var(--top-bar-height))",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            py: 2,
            zIndex: 1,
          }}
        >
          {renderButtons(false)}
        </Box>
      )}
      {settingsOpen && (
        <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      )}
      {taskOpen && (
        <TaskDrawer open={taskOpen} onClose={() => setTaskOpen(false)} />
      )}
    </>
  );
}

