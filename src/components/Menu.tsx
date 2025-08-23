import { Button, Stack } from "@mui/material";
import { saveCampaign, loadCampaign } from "../store";

export default function Menu() {
  return (
    <Stack spacing={2} direction="row">
      <Button variant="contained" onClick={() => saveCampaign()}>
        Save Campaign
      </Button>
      <Button variant="outlined" onClick={() => loadCampaign()}>
        Load Campaign
      </Button>
    </Stack>
  );
}

