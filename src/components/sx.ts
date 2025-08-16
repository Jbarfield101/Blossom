import type { SxProps } from "@mui/material";

export const fixedIconButtonSx: SxProps = {
  position: "fixed",
  top: 12,
  zIndex: 2,
};

export const carouselContainerSx: SxProps = {
  height: "100vh",
  display: "grid",
  placeItems: "center",
  position: "relative",
  overflow: "hidden",
  zIndex: 1,
};

export const carouselItemsWrapperSx: SxProps = {
  position: "relative",
  width: "100%",
  height: 240,
};

export const carouselItemSx = (
  offset: number,
  center: boolean,
  gap: number,
  scaleMid: number,
  scaleSide: number
): SxProps => ({
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: `translate(-50%, -50%) translateX(${offset * gap}px) scale(${center ? scaleMid : scaleSide})`,
  transition: "transform 280ms ease, opacity 280ms ease, color 180ms ease",
  textAlign: "center",
  opacity: center ? 1 : 0.6,
  userSelect: "none",
  width: 180,
});

export const carouselIconButtonSx = (center: boolean, accent: string): SxProps => ({
  fontSize: "3rem",
  color: center ? accent : "white",
  boxShadow: center ? `0 0 20px 6px ${accent}55` : "none",
  transition: "transform 280ms ease, color 180ms ease, box-shadow 180ms ease",
  "&:hover": {
    color: accent,
    transform: "scale(1.05)",
    boxShadow: `0 0 20px 6px ${accent}55`,
  },
});

export const carouselLabelSx = (center: boolean, accent: string): SxProps => ({
  color: center ? accent : "white",
  mt: 1.5,
  fontSize: 14,
});
