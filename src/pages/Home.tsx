import { useState } from "react";
import HoverCircle from "../components/HoverCircle";
import FeatureCarousel from "../components/FeatureCarousel";
import VersionBadge from "../components/VersionBadge";

export default function Home() {
  const [hoverColor, setHoverColor] = useState("rgba(255,255,255,0.22)");
  return (
    <>
      <HoverCircle color={hoverColor} />
      <FeatureCarousel onHoverColor={setHoverColor} />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      >
        <VersionBadge />
      </div>
    </>
  );
}
