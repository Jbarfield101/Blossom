import { SxProps, Theme } from "@mui/material/styles";

export const countdownContainerSx: SxProps<Theme> = {
  position: "absolute",
  top: { xs: "1rem", sm: "1.5rem" },
  right: { xs: "1rem", sm: "1.5rem" },
  zIndex: 50,
  color: "#fff",
  textAlign: "right",
};

export const countdownTextSx: SxProps<Theme> = {
  fontSize: { xs: "0.875rem", sm: "1rem" },
};

export const versionBadgeContainerSx: SxProps<Theme> = {
  position: "absolute",
  top: { xs: "1rem", sm: "1.5rem" },
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 50,
  pointerEvents: "none",
  textAlign: "center",
  color: "#fff",
};
