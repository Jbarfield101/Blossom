import { useState } from "react";
import { FaQuestionCircle } from "react-icons/fa";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";

export default function HelpIcon({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip
      title={text}
      open={open}
      onClose={() => setOpen(false)}
      disableFocusListener
      disableHoverListener
      disableTouchListener
      arrow
    >
      <IconButton
        size="small"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        aria-label="help"
        style={{ marginLeft: 4, padding: 2, cursor: "help", opacity: 0.6 }}
      >
        <FaQuestionCircle />
      </IconButton>
    </Tooltip>
  );
}
