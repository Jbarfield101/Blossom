import { IconButton, Tooltip, Badge } from "@mui/material";
import type { SxProps } from "@mui/material";
import { fixedIconButtonSx } from "./sx";
import {
  FaHome,
  FaWrench,
  FaTasks,
  FaArrowLeft,
  FaCameraRetro,
  FaCalendarAlt,
} from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import SettingsDrawer from "./SettingsDrawer";
import ErrorBoundary from "./ErrorBoundary";
import TaskDrawer from "./TaskDrawer";
import { useTasks } from "../store/tasks";

export default function TopBar() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const taskCount = useTasks((s) =>
    Object.values(s.tasks).filter((t) => t.status === "queued" || t.status === "running").length
  );
  const subscribe = useTasks((s) => s.subscribe);
  const isHome = pathname === "/";

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    (async () => {
      try {
        unlisten = await subscribe();
      } catch (err) {
        console.error("Failed to subscribe", err);
      }
    })();
    return () => {
      unlisten?.();
    };
  }, [subscribe]);
  const activeSx = (p: string): SxProps =>
    pathname === p
      ? { color: "#000", backgroundColor: "#fff", borderRadius: 4 }
      : { color: "white" };

  return (
    <>
      {!isHome && (
        <>
          <Tooltip title="Back">
            <IconButton
              onClick={() => nav(-1)}
              sx={{
                ...fixedIconButtonSx,
                left: { xs: 8, sm: 12 },
              }}
              aria-label="Back"
            >
              <FaArrowLeft />
            </IconButton>
          </Tooltip>

          <Tooltip title="Home">
            <IconButton
              onClick={() => nav("/")}
              sx={{
                ...fixedIconButtonSx,
                left: { xs: 44, sm: 60 },
                ...activeSx("/"),
              }}
              aria-label="Home"
              aria-current={pathname === "/" ? "page" : undefined}
            >
              <FaHome />
            </IconButton>
          </Tooltip>

          <Tooltip title="ComfyUI">
            <IconButton
              onClick={() => nav("/comfy")}
              sx={{
                ...fixedIconButtonSx,
                left: { xs: 80, sm: 108 },
                ...activeSx("/comfy"),
              }}
              aria-label="ComfyUI"
              aria-current={pathname === "/comfy" ? "page" : undefined}
            >
              <FaCameraRetro />
            </IconButton>
          </Tooltip>

          <Tooltip title="Calendar">
            <IconButton
              onClick={() => nav("/calendar")}
              sx={{
                ...fixedIconButtonSx,
                left: { xs: 116, sm: 156 },
                ...activeSx("/calendar"),
              }}
              aria-label="Calendar"
              aria-current={pathname === "/calendar" ? "page" : undefined}
            >
              <FaCalendarAlt />
            </IconButton>
          </Tooltip>

          <Tooltip title="Tasks">
            <Badge badgeContent={taskCount} color="secondary" invisible={taskCount === 0}>
              <IconButton
                onClick={() => setTaskOpen(true)}
                sx={{
                  ...fixedIconButtonSx,
                  right: { xs: 44, sm: 60 },
                  color: taskOpen ? "#000" : "white",
                  backgroundColor: taskOpen ? "#fff" : "transparent",
                  borderRadius: 4,
                }}
                aria-label="Tasks"
                aria-expanded={taskOpen}
              >
                <FaTasks />
              </IconButton>
            </Badge>
          </Tooltip>
        </>
      )}

      <Tooltip title="Settings">
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            ...fixedIconButtonSx,
            right: { xs: 8, sm: 12 },
            ...(open
              ? { color: "#000", backgroundColor: "#fff", borderRadius: 4 }
              : { color: "white" }),
          }}
          aria-label="Settings"
          aria-expanded={open}
        >
          <FaWrench />
        </IconButton>
      </Tooltip>
      <ErrorBoundary>
        <SettingsDrawer open={open} onClose={() => setOpen(false)} />
      </ErrorBoundary>
      <TaskDrawer open={taskOpen} onClose={() => setTaskOpen(false)} />
    </>
  );
}
