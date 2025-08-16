import { Button, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Center from "./_Center";

interface Feature {
  label: string;
  path?: string;
}

const features: Feature[] = [
  { label: "Lore" },
  { label: "Journal" },
  { label: "NPC Maker", path: "/dnd/npc-maker" },
  { label: "World Builder", path: "/dnd/world-builder" },
  { label: "NPC List" },
];

export default function DND() {
  const navigate = useNavigate();
  return (
    <Center>
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 400 }}>
        {features.map((feature) => (
          <Button
            key={feature.label}
            variant="contained"
            onClick={() => feature.path && navigate(feature.path)}
          >
            {feature.label}
          </Button>
        ))}
      </Stack>
    </Center>
  );
}
