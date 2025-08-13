import { IconButton } from "@mui/material";
import { FaHome, FaWrench } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";

export default function TopBar() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  return (
    <>
      <IconButton
        onClick={() => nav("/")}
        style={{ position: "fixed", top: 12, left: 12, zIndex: 2, color: "#fff" }}
        aria-label="Home"
      >
        <FaHome />
      </IconButton>

      <IconButton
        onClick={() => nav("/settings")}
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 2,
          color: pathname === "/settings" ? "var(--accent)" : "var(--text)",
        }}
        aria-label="Settings"
      >
        <FaWrench />
      </IconButton>
    </>
  );
}
