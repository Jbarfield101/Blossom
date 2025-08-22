import { Canvas, useFrame } from "@react-three/fiber";
import { Box, Button, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
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

function Die({ sides, roll }: { sides: number; roll: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const velocity = useRef<[number, number, number]>([0, 0, 0]);
  const geometry = useMemo(() => getGeometry(sides), [sides]);

  useEffect(() => {
    velocity.current = [
      THREE.MathUtils.randFloatSpread(10),
      THREE.MathUtils.randFloatSpread(10),
      THREE.MathUtils.randFloatSpread(10),
    ];
    meshRef.current?.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );
  }, [roll, sides]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += velocity.current[0] * delta;
    meshRef.current.rotation.y += velocity.current[1] * delta;
    meshRef.current.rotation.z += velocity.current[2] * delta;
    velocity.current = velocity.current.map((v) => v * 0.95) as [number, number, number];
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial color="#e0e0e0" />
    </mesh>
  );
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
        <Die sides={sides} roll={roll} />
      </Canvas>
    </Box>
  );
}
