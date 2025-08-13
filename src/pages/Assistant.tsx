import { Button, Stack } from "@mui/material";
import Center from "./_Center";

const features = [
  "Prompt Factory",
  "Script",
  "Music",
  "SEO",
  "Orchestration",
  "RAG",
  "Chat",
  "World Builder",
  "Big Brother updates",
];

export default function Assistant() {
  return (
    <Center>
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 400 }}>
        {features.map((feature) => (
          <Button key={feature} variant="contained">
            {feature}
          </Button>
        ))}
      </Stack>
    </Center>
  );
}
