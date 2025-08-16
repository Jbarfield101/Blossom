import { IconButton } from "@mui/material";
import { FaHome, FaWrench } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";

export default function TopBar() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const activeStyles = (p: string) =>
    pathname === p
      ? { color: "#000", backgroundColor: "#fff", borderRadius: 4 }
      : { color: "white" };

  return (
    <>
      <IconButton
        onClick={() => nav("/")}
        style={{ position: "fixed", top: 12, left: 12, zIndex: 2, ...activeStyles("/") }}
        aria-label="Home"
        aria-current={pathname === "/" ? "page" : undefined}
      >
        <FaHome />
      </IconButton>

      <IconButton
        onClick={() => nav("/settings")}
        style={{ position: "fixed", top: 12, right: 12, zIndex: 2, ...activeStyles("/settings") }}
        aria-label="Settings"
        aria-current={pathname === "/settings" ? "page" : undefined}
      >
        <FaWrench />
      </IconButton>
    </>
  );
}
