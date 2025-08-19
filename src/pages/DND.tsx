import { Box, Tab, Tabs } from "@mui/material";
import { SyntheticEvent, useState } from "react";
import NpcForm from "../features/dnd/NpcForm";
import LoreForm from "../features/dnd/LoreForm";
import QuestForm from "../features/dnd/QuestForm";
import EncounterForm from "../features/dnd/EncounterForm";

export default function DND() {
  const [tab, setTab] = useState(0);
  const handleChange = (_e: SyntheticEvent, v: number) => setTab(v);
  return (
    <Box sx={{ p: 2 }}>
      <Tabs value={tab} onChange={handleChange}>
        <Tab label="NPC" />
        <Tab label="Lore" />
        <Tab label="Quest" />
        <Tab label="Encounter" />
      </Tabs>
      {tab === 0 && <NpcForm />}
      {tab === 1 && <LoreForm />}
      {tab === 2 && <QuestForm />}
      {tab === 3 && <EncounterForm />}
    </Box>
  );
}
