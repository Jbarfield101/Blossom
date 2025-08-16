import { IconButton } from "@mui/material";
import type { SxProps } from "@mui/material";
import { fixedIconButtonSx } from "./sx";
import { FaHome, FaWrench } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";

export default function TopBar() {
  const nav = useNavigate();
  const { pathname } = useLocation();
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
        onClick={() => nav("/settings")}
        sx={{ ...fixedIconButtonSx, right: 12, ...activeSx("/settings") }}
        aria-label="Settings"
        aria-current={pathname === "/settings" ? "page" : undefined}
      >
        <FaWrench />
      </IconButton>
    </>
  );
}
