import { IconButton, Tooltip } from "@mui/material";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function BackButton() {
  const nav = useNavigate();
  return (
    <Tooltip title="Back">
      <IconButton onClick={() => nav(-1)} sx={{ color: "white" }} aria-label="Back">
        <FaArrowLeft />
      </IconButton>
    </Tooltip>
  );
}
