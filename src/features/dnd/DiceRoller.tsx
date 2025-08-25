import { Canvas } from "@react-three/fiber";
import {
  Physics,
  useBox,
  usePlane,
  useConvexPolyhedron,
  useCylinder,
} from "@react-three/cannon/dist";
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

function createPentagonalTrapezohedron() {
  const n = 5;
  const radius = 1;
  const equatorHeight = 0.2;
  const poleHeight = 0.8;

  const ring: THREE.Vector3[] = [];
  for (let i = 0; i < 2 * n; i++) {
    const angle = (Math.PI / n) * i;
    const y = i % 2 === 0 ? equatorHeight : -equatorHeight;
    ring.push(new THREE.Vector3(Math.cos(angle), y, Math.sin(angle)));
  }
  const top = new THREE.Vector3(0, poleHeight, 0);
  const bottom = new THREE.Vector3(0, -poleHeight, 0);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const vertices = [...ring, top, bottom];
  const faces: number[][] = [];

  let idx = 0;
  for (let i = 0; i < 2 * n; i++) {
    const next = (i + 1) % (2 * n);
    const A = i % 2 === 0 ? top : bottom;
    const B = ring[i];
    const C = i % 2 === 0 ? bottom : top;
    const D = ring[next];

    positions.push(
      A.x,
      A.y,
      A.z,
      B.x,
      B.y,
      B.z,
      C.x,
      C.y,
      C.z,
      D.x,
      D.y,
      D.z
    );

    uvs.push(0.5, 1, 1, 0, 0, 0, 0, 1);
    indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
    const topIndex = vertices.length - 2;
    const bottomIndex = vertices.length - 1;
    faces.push(
      i % 2 === 0
        ? [topIndex, i, bottomIndex, next]
        : [bottomIndex, i, topIndex, next]
    );
    idx += 4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  addNumberedFaceGroups(10, geometry);
  return { geometry, vertices, faces };
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
      return createPentagonalTrapezohedron();
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
  return { geometry } as { geometry: THREE.BufferGeometry; vertices?: THREE.Vector3[]; faces?: number[][] };
}

function getConvexPolyhedronProps(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const indexAttr = geometry.index;
  const vertices: number[][] = [];
  const faces: number[][] = [];
  const vertexMap = new Map<string, number>();

  const getVertexIndex = (i: number) => {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const key = `${x},${y},${z}`;
    if (!vertexMap.has(key)) {
      vertexMap.set(key, vertices.length);
      vertices.push([x, y, z]);
    }
    return vertexMap.get(key)!;
  };

  const indices = indexAttr
    ? Array.from(indexAttr.array as ArrayLike<number>)
    : Array.from({ length: position.count }, (_, i) => i);

  for (let i = 0; i < indices.length; i += 3) {
    const a = getVertexIndex(indices[i]);
    const b = getVertexIndex(indices[i + 1]);
    const c = getVertexIndex(indices[i + 2]);
    faces.push([a, b, c]);
  }
  return { vertices, faces };
}

function getPhysicsBodyProps(
  sides: number,
  geometry: THREE.BufferGeometry,
  vertices?: THREE.Vector3[],
  faces?: number[][]
) {
  if (sides === 6) {
    geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    geometry.boundingBox!.getSize(size);
    return { hook: useBox, args: { args: [size.x, size.y, size.z] as [number, number, number] } };
  }

  if (sides === 10) {
    geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    geometry.boundingBox!.getSize(size);
    const radius = Math.max(size.x, size.z) / 2;
    const height = size.y;
    return {
      hook: useCylinder,
      args: { args: [radius, radius, height, 5] as [number, number, number, number] },
    };
  }

  const props = vertices && faces ? { vertices, faces } : getConvexPolyhedronProps(geometry);
  return { hook: useConvexPolyhedron, args: props };
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
  const { geometry, vertices, faces } = useMemo(() => getGeometry(sides), [sides]);
  const materials = useMemo(() => createDiceMaterials(geometry.groups.length), [geometry]);
  const { hook, args } = useMemo(
    () => getPhysicsBodyProps(sides, geometry, vertices, faces),
    [sides, geometry, vertices, faces]
  );
  const [ref, api] = hook(() => ({ mass: 1, ...args }));

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
  const [roll, setRoll] = useState(0);
  const [diceCount, setDiceCount] = useState(1);
  const [selectedSides, setSelectedSides] = useState<number | null>(6);
  const [dice, setDice] = useState<number[]>([selectedSides ?? 6]);

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
      setDice(Array(diceCount).fill(newSides));
    }
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    const count = Number.isNaN(value) ? 1 : value;
    setDiceCount(count);
    const sides = selectedSides ?? 6;
    setExpression(`${count}d${sides}`);
    setDice(Array(count).fill(sides));
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        fontFamily: "typography.fontFamily",
      }}
    >
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
      <Button
        variant="contained"
        onClick={handleRoll}
        sx={{
          maxWidth: 200,
          bgcolor: "primary.main",
          "&:hover": { bgcolor: "primary.dark" },
        }}
      >
        Roll
      </Button>
      {result !== null && (
        <Typography variant="h6" sx={{ color: "secondary.main" }}>
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
              key={`${s}-${i}`}
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
