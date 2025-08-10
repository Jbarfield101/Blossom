import { useState } from "react";
import HoverCircle from "../components/HoverCircle";
import FeatureCarousel from "../components/FeatureCarousel";

export default function Home() {
  const [hoverColor, setHoverColor] = useState("rgba(255,255,255,0.22)");
  return (
    <>
      <HoverCircle color={hoverColor} />
      <FeatureCarousel onHoverColor={setHoverColor} />
    </>
  );
}
