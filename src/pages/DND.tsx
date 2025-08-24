import { Box, Tab, Tabs, TextField, MenuItem } from "@mui/material";
import {
  Person,
  MenuBook,
  TravelExplore,
  SportsKabaddi,
  Gavel,
  AutoStories,
  Casino,
  Map,
  MilitaryTech,
} from "@mui/icons-material";
import { SyntheticEvent, useState } from "react";
import { DndThemeContext, themes } from "../features/dnd/theme";
import type { DndTheme } from "../features/dnd/types";
import NpcForm from "../features/dnd/NpcForm";
import LoreForm from "../features/dnd/LoreForm";
import QuestForm from "../features/dnd/QuestForm";
import EncounterForm from "../features/dnd/EncounterForm";
import RuleForm from "../features/dnd/RuleForm";
import SpellForm from "../features/dnd/SpellForm";
import DiceRoller from "../features/dnd/DiceRoller";
import TabletopMap from "../features/dnd/TabletopMap";
import WarTable from "../features/dnd/WarTable";

export default function DND() {
  const [tab, setTab] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<DndTheme>("Parchment");
  const handleChange = (_e: SyntheticEvent, v: number) => setTab(v);
  return (
    <DndThemeContext.Provider value={selectedTheme}>
      <Box sx={{ p: 2 }}>
        <Tabs
          value={tab}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ bgcolor: "#f3e5ab" }}
        >
          <Tab icon={<Person />} label="NPC" />
          <Tab icon={<MenuBook />} label="Lore" />
          <Tab icon={<TravelExplore />} label="Quest" />
          <Tab icon={<SportsKabaddi />} label="Encounter" />
          <Tab icon={<Gavel />} label="Rulebook" />
          <Tab icon={<AutoStories />} label="Spellbook" />
          <Tab icon={<Casino />} label="Dice" />
          <Tab icon={<Map />} label="Tabletop" />
          <Tab icon={<MilitaryTech />} label="War Table" />
        </Tabs>
        <Box sx={{ my: 2, maxWidth: 200 }}>
          <TextField
            select
            label="Theme"
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value as DndTheme)}
            fullWidth
          >
            {themes.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        {tab === 0 && <NpcForm />}
        {tab === 1 && <LoreForm />}
        {tab === 2 && <QuestForm />}
        {tab === 3 && <EncounterForm />}
        {tab === 4 && <RuleForm />}
        {tab === 5 && <SpellForm />}
        {tab === 6 && <DiceRoller />}
        {tab === 7 && <TabletopMap />}
        {tab === 8 && <WarTable />}
      </Box>
    </DndThemeContext.Provider>
  );
}
