import { Canvas } from "@react-three/fiber";
import { Physics, useBox, usePlane } from "@react-three/cannon";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

function getGeometry(sides: number) {
  switch (sides) {
    case 4:
      return new THREE.TetrahedronGeometry(1);
    case 6:
      return new THREE.BoxGeometry(1, 1, 1);
    case 8:
      return new THREE.OctahedronGeometry(1);
    case 10:
      return new THREE.CylinderGeometry(1, 1, 1, 10);
    case 12:
      return new THREE.DodecahedronGeometry(1);
    case 20:
      return new THREE.IcosahedronGeometry(1);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

function createDiceMaterials() {
  const createTexture = (n: number) => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "black";
    ctx.font = "bold 96px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(n.toString(), size / 2, size / 2);
    return new THREE.CanvasTexture(canvas);
  };
  return [1, 2, 3, 4, 5, 6].map(
    (n) => new THREE.MeshStandardMaterial({ map: createTexture(n) })
  );
}

function Plane() {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0] }));
  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#999" />
    </mesh>
  );
}

function Die({ sides, roll }: { sides: number; roll: number }) {
  const geometry = useMemo(() => getGeometry(sides), [sides]);
  const materials = useMemo(() => {
    if (sides === 6) return createDiceMaterials();
    return [new THREE.MeshStandardMaterial({ color: "#e0e0e0" })];
  }, [sides]);
  const [ref, api] = useBox(() => ({ mass: 1, args: [1, 1, 1] }));

  useEffect(() => {
    api.position.set(0, 2, 0);
    api.velocity.set(
      THREE.MathUtils.randFloatSpread(5),
      THREE.MathUtils.randFloatSpread(5) + 5,
      THREE.MathUtils.randFloatSpread(5)
    );
    api.angularVelocity.set(
      THREE.MathUtils.randFloatSpread(10),
      THREE.MathUtils.randFloatSpread(10),
      THREE.MathUtils.randFloatSpread(10)
    );
  }, [roll, api]);

  return <mesh ref={ref} geometry={geometry} material={materials} />;
}

export default function DiceRoller() {
  const [sides, setSides] = useState(6);
  const [result, setResult] = useState<number | null>(null);
  const [roll, setRoll] = useState(0);

  const handleRoll = () => {
    setRoll((r) => r + 1);
    setResult(Math.floor(Math.random() * sides) + 1);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <FormControl sx={{ maxWidth: 200 }}>
        <InputLabel id="dice-select-label">Dice</InputLabel>
        <Select
          labelId="dice-select-label"
          value={sides}
          label="Dice"
          onChange={(e) => setSides(Number(e.target.value))}
        >
          <MenuItem value={4}>D4</MenuItem>
          <MenuItem value={6}>D6</MenuItem>
          <MenuItem value={8}>D8</MenuItem>
          <MenuItem value={10}>D10</MenuItem>
          <MenuItem value={12}>D12</MenuItem>
          <MenuItem value={20}>D20</MenuItem>
        </Select>
      </FormControl>
      <Button variant="contained" onClick={handleRoll} sx={{ maxWidth: 200 }}>
        Roll
      </Button>
      {result !== null && (
        <Typography variant="h6">Result: {result}</Typography>
      )}
      <Canvas style={{ height: 300 }}>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Physics>
          <Plane />
          <Die sides={sides} roll={roll} />
        </Physics>
      </Canvas>
    </Box>
  );
}
