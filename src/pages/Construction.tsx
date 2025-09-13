import { Button, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Center from "./_Center";
import BackButton from "../components/BackButton";

export default function Construction() {
  const navigate = useNavigate();
  return (
    <Center>
      <BackButton />
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 400 }}>
        <Button variant="contained" onClick={() => navigate("/laser")}>Laser Lab</Button>
        <Button variant="contained" onClick={() => navigate("/assistant")}>Agents</Button>
        <Button variant="contained" onClick={() => {}}>
          Create new
        </Button>
      </Stack>
    </Center>
  );
}
