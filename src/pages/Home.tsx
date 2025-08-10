// src/pages/Home.tsx
import { useState } from "react";
import HoverCircle from "../components/HoverCircle";
import FeatureCarousel from "../components/FeatureCarousel";
import VersionBadge from "../components/VersionBadge";

export default function Home() {
  const [hoverColor, setHoverColor] = useState("rgba(255,255,255,0.22)");

  return (
    <>
      {/* Top-center app title and version */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
          pointerEvents: "none",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "2rem" }}>Blossom</h1>
        <VersionBadge version="0.1.1" />
      </div>

      {/* Background hover effect */}
      <HoverCircle color={hoverColor} />

      {/* Carousel icons */}
      <FeatureCarousel onHoverColor={setHoverColor} />
    </>
  );
}
