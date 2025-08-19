import { IconButton } from "@mui/material";
import type { SxProps } from "@mui/material";
import { fixedIconButtonSx } from "./sx";
import { FaHome, FaWrench, FaUser } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import SettingsDrawer from "./SettingsDrawer";

export default function TopBar() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const activeSx = (p: string): SxProps =>
    pathname === p
      ? { color: "#000", backgroundColor: "#fff", borderRadius: 4 }
      : { color: "white" };

  return (
    <>
      <IconButton
        onClick={() => nav("/")}
        sx={{ ...fixedIconButtonSx, left: 12, ...activeSx("/") }}
        aria-label="Home"
        aria-current={pathname === "/" ? "page" : undefined}
      >
        <FaHome />
      </IconButton>

      <IconButton
        onClick={() => nav("/user")}
        sx={{ ...fixedIconButtonSx, left: 60, ...activeSx("/user") }}
        aria-label="User"
        aria-current={pathname === "/user" ? "page" : undefined}
      >
        <FaUser />
      </IconButton>

      <IconButton
        onClick={() => setOpen(true)}
        sx={{
          ...fixedIconButtonSx,
          right: 12,
          ...(open
            ? { color: "#000", backgroundColor: "#fff", borderRadius: 4 }
            : { color: "white" }),
        }}
        aria-label="Settings"
        aria-expanded={open}
      >
        <FaWrench />
      </IconButton>
      <SettingsDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
