import { IconButton, Tooltip, Badge } from "@mui/material";
import type { SxProps } from "@mui/material";
import { fixedIconButtonSx } from "./sx";
import { FaHome, FaWrench, FaUser, FaTasks, FaArrowLeft } from "react-icons/fa";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import SettingsDrawer from "./SettingsDrawer";
import ErrorBoundary from "./ErrorBoundary";
import TaskDrawer from "./TaskDrawer";
import { useTasks } from "../store/tasks";
import { useUsers } from "../features/users/useUsers";

export default function TopBar() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const taskCount = useTasks((s) =>
    Object.values(s.tasks).filter((t) => t.status === "queued" || t.status === "running").length
  );
  const subscribe = useTasks((s) => s.subscribe);
  const userName = useUsers((s) => {
    const id = s.currentUserId;
    return id ? s.users[id]?.name : null;
  });

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

      <Tooltip title={userName ? `User: ${userName}` : "User"}>
        <IconButton
          onClick={() => nav("/user")}
          sx={{
            ...fixedIconButtonSx,
            left: { xs: 80, sm: 108 },
            ...activeSx("/user"),
          }}
          aria-label="User"
          aria-current={pathname === "/user" ? "page" : undefined}
        >
          <FaUser />
        </IconButton>
      </Tooltip>

      <Tooltip title="NPC Library">
        <IconButton
          onClick={() => nav("/dnd/npcs-library")}
          sx={{
            ...fixedIconButtonSx,
            left: { xs: 116, sm: 156 },
            ...activeSx("/dnd/npcs-library"),
          }}
          aria-label="NPC Library"
          aria-current={pathname === "/dnd/npcs-library" ? "page" : undefined}
        >
          <MenuBookIcon />
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
