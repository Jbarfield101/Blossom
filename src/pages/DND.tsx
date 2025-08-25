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
  LibraryBooks,
} from "@mui/icons-material";
import { SyntheticEvent, useState, ChangeEvent } from "react";
// Removed custom D&D theming in favor of default MUI styling
import NpcForm from "../features/dnd/NpcForm";
import LoreForm from "../features/dnd/LoreForm";
import NPCList from "./NPCList";
import QuestForm from "../features/dnd/QuestForm";
import EncounterForm from "../features/dnd/EncounterForm";
import RuleForm from "../features/dnd/RuleForm";
import SpellForm from "../features/dnd/SpellForm";
import DiceRoller from "../features/dnd/DiceRoller";
import TabletopMap from "../features/dnd/TabletopMap";
import WarTable from "../features/dnd/WarTable";
import { useWorlds } from "../store/worlds";
import NewWorldDialog from "../components/NewWorldDialog";

export default function DND() {
  const [tab, setTab] = useState(0);
  const worlds = useWorlds((s) => s.worlds);
  const world = useWorlds((s) => s.currentWorld);
  const addWorld = useWorlds((s) => s.addWorld);
  const setCurrentWorld = useWorlds((s) => s.setCurrentWorld);
  const [newWorldOpen, setNewWorldOpen] = useState(false);
  const handleChange = (_e: SyntheticEvent, v: number) => setTab(v);
  const handleWorldChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "__new__") {
      setNewWorldOpen(true);
    } else {
      setCurrentWorld(value);
    }
  };
  const handleCreateWorld = (name: string) => {
    addWorld(name);
    setCurrentWorld(name);
  };
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ my: 2, maxWidth: 200, mx: "auto" }}>
        <TextField
          select
          label="World"
          value={world}
          onChange={handleWorldChange}
          fullWidth
        >
          {worlds.map((w) => (
            <MenuItem key={w} value={w}>
              {w}
            </MenuItem>
          ))}
          <MenuItem value="__new__">Create New World</MenuItem>
        </TextField>
      </Box>
      <NewWorldDialog
        open={newWorldOpen}
        onClose={() => setNewWorldOpen(false)}
        onSubmit={handleCreateWorld}
      />
      {world && (
        <>
          <Tabs
            value={tab}
            onChange={handleChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<Person />} label="NPC" />
            <Tab icon={<LibraryBooks />} label="NPC Library" />
            <Tab icon={<MenuBook />} label="Lore" />
            <Tab icon={<TravelExplore />} label="Quest" />
            <Tab icon={<SportsKabaddi />} label="Encounter" />
            <Tab icon={<Gavel />} label="Rulebook" />
            <Tab icon={<AutoStories />} label="Spellbook" />
            <Tab icon={<Casino />} label="Dice" />
            <Tab icon={<Map />} label="Tabletop" />
            <Tab icon={<MilitaryTech />} label="War Table" />
          </Tabs>
          {tab === 0 && <NpcForm world={world} />}
          {tab === 1 && <NPCList />}
          {tab === 2 && <LoreForm world={world} />}
          {tab === 3 && <QuestForm />}
          {tab === 4 && <EncounterForm />}
          {tab === 5 && <RuleForm />}
          {tab === 6 && <SpellForm />}
          {tab === 7 && <DiceRoller />}
          {tab === 8 && <TabletopMap />}
          {tab === 9 && <WarTable />}
        </>
      )}
    </Box>
  );
}
