import { Canvas } from "@react-three/fiber";
import { Physics, useBox, usePlane } from "@react-three/cannon";
import { Box, Button, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { rollDiceExpression } from "../../dnd/rules";

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

function Die({
  sides,
  roll,
  position,
}: {
  sides: number;
  roll: number;
  position: [number, number, number];
}) {
  const geometry = useMemo(() => getGeometry(sides), [sides]);
  const materials = useMemo(() => {
    if (sides === 6) return createDiceMaterials();
    return [new THREE.MeshStandardMaterial({ color: "#e0e0e0" })];
  }, [sides]);
  const [ref, api] = useBox(() => ({ mass: 1, args: [1, 1, 1] }));

  useEffect(() => {
    api.position.set(position[0], position[1], position[2]);
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
  const [expression, setExpression] = useState("1d6");
  const [result, setResult] = useState<number | null>(null);
  const [rolls, setRolls] = useState<number[]>([]);
  const [dice, setDice] = useState<number[]>([6]);
  const [roll, setRoll] = useState(0);

  const handleRoll = () => {
    const { total, rolls } = rollDiceExpression(expression);
    setRoll((r) => r + 1);
    setResult(total);
    setRolls(rolls.map((r) => r.value));
    setDice(rolls.map((r) => r.sides));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        label="Dice"
        value={expression}
        onChange={(e) => setExpression(e.target.value)}
        sx={{ maxWidth: 200 }}
      />
      <Button variant="contained" onClick={handleRoll} sx={{ maxWidth: 200 }}>
        Roll
      </Button>
      {result !== null && (
        <Typography variant="h6">
          Result: {result} {rolls.length > 0 && `( ${rolls.join(", ")} )`}
        </Typography>
      )}
      <Canvas style={{ height: 300 }}>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Physics>
          <Plane />
          {dice.map((s, i) => (
            <Die
              key={i}
              sides={s}
              roll={roll}
              position={[-2 + i * 2, 2, 0]}
            />
          ))}
        </Physics>
      </Canvas>
    </Box>
  );
}
