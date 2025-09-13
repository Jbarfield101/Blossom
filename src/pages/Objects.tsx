import { FaBlender } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";

export default function Objects() {
  const nav = useNavigate();
  return (
    <>
      <BackButton />
      <div
        style={{
          height: "calc(100vh - var(--top-bar-height))",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
        }}
        onClick={() => nav("/objects/blender")}
      >
        <FaBlender size={64} />
      </div>
    </>
  );
}
