import { Box, Tab, Tabs } from "@mui/material";
import { SyntheticEvent, useState } from "react";
import NpcForm from "../features/dnd/NpcForm";
import QuestForm from "../features/dnd/QuestForm";
import EncounterForm from "../features/dnd/EncounterForm";

export default function DND() {
  const [tab, setTab] = useState(0);
  const handleChange = (_e: SyntheticEvent, v: number) => setTab(v);
  return (
    <Box sx={{ p: 2 }}>
      <Tabs value={tab} onChange={handleChange}>
        <Tab label="NPC" />
        <Tab label="Quest" />
        <Tab label="Encounter" />
      </Tabs>
      {tab === 0 && <NpcForm />}
      {tab === 1 && <QuestForm />}
      {tab === 2 && <EncounterForm />}
    </Box>
  );
}
