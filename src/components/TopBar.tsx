import { IconButton } from "@mui/material";
import { FaHome, FaWrench } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";

export default function TopBar() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const activeColor = (p: string) => (pathname === p ? "#111" : "white");

  return (
    <>
      <IconButton
        onClick={() => nav("/")}
        style={{ position: "fixed", top: 12, left: 12, zIndex: 2, color: activeColor("/") }}
        aria-label="Home"
      >
        <FaHome />
      </IconButton>

      <IconButton
        onClick={() => nav("/settings")}
        style={{ position: "fixed", top: 12, right: 12, zIndex: 2, color: activeColor("/settings") }}
        aria-label="Settings"
      >
        <FaWrench />
      </IconButton>
    </>
  );
}
