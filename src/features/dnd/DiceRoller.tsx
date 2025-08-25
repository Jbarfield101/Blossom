import { Canvas } from "@react-three/fiber";
import { Physics, useBox, usePlane } from "@react-three/cannon";
import {
  Box,
  Button,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { rollDiceExpression } from "../../dnd/rules";

function addNumberedFaceGroups(
  sides: number,
  geometry: THREE.BufferGeometry
) {
  if (geometry.groups.length > 0) return;
  const index = geometry.index;
  if (!index) return;
  const indicesPerSide = index.count / sides;
  for (let i = 0; i < index.count; i += indicesPerSide) {
    geometry.addGroup(i, indicesPerSide, i / indicesPerSide);
  }
}

function getGeometry(sides: number) {
  let geometry: THREE.BufferGeometry;
  switch (sides) {
    case 4:
      geometry = new THREE.TetrahedronGeometry(1);
      break;
    case 6:
      geometry = new THREE.BoxGeometry(1, 1, 1);
      break;
    case 8:
      geometry = new THREE.OctahedronGeometry(1);
      break;
    case 10:
      geometry = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
      break;
    case 12:
      geometry = new THREE.DodecahedronGeometry(1);
      break;
    case 20:
      geometry = new THREE.IcosahedronGeometry(1);
      break;
    default:
      geometry = new THREE.BoxGeometry(1, 1, 1);
  }
  addNumberedFaceGroups(sides, geometry);
  return geometry;
}

function createDiceMaterials(sides: number) {
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
  return Array.from({ length: sides }, (_, i) =>
    new THREE.MeshStandardMaterial({ map: createTexture(i + 1) })
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
  const materials = useMemo(() => createDiceMaterials(sides), [sides]);
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
  const [diceCount, setDiceCount] = useState(1);
  const [selectedSides, setSelectedSides] = useState<number | null>(6);

  const handleRoll = () => {
    const { total, rolls } = rollDiceExpression(expression);
    setRoll((r) => r + 1);
    setResult(total);
    setRolls(rolls.map((r) => r.value));
    setDice(rolls.map((r) => r.sides));
  };

  const handleSidesChange = (
    _event: React.MouseEvent<HTMLElement>,
    newSides: number | null
  ) => {
    if (newSides !== null) {
      setSelectedSides(newSides);
      setExpression(`${diceCount}d${newSides}`);
    }
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    const count = Number.isNaN(value) ? 1 : value;
    setDiceCount(count);
    if (selectedSides !== null) {
      setExpression(`${count}d${selectedSides}`);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <TextField
          label="Count"
          type="number"
          value={diceCount}
          onChange={handleCountChange}
          inputProps={{ min: 1 }}
          sx={{ width: 80 }}
        />
        <ToggleButtonGroup
          value={selectedSides}
          exclusive
          onChange={handleSidesChange}
          aria-label="dice type"
          size="small"
        >
          {[4, 6, 8, 10, 12, 20].map((s) => (
            <ToggleButton key={s} value={s} aria-label={`d${s}`}>
              d{s}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
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
