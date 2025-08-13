import { Canvas } from "@react-three/fiber";
import { useNavigate } from "react-router-dom";

function Cube({ onSelect }:{ onSelect:()=>void }){
  return (
    <mesh onClick={onSelect} style={{ cursor:"pointer" }}>
      <boxGeometry args={[1,1,1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default function Objects(){
  const nav = useNavigate();
  return (
    <div style={{ height:"100vh" }}>
      <Canvas camera={{ position:[3,3,3] }}>
        <ambientLight />
        <pointLight position={[10,10,10]} />
        <Cube onSelect={()=>nav("/objects/blender")} />
      </Canvas>
    </div>
  );
}
