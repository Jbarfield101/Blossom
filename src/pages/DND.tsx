import { Box, Tab, Tabs, TextField, MenuItem } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
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
import { createDndTheme } from "../theme";
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

type TabConfig = {
  icon: JSX.Element;
  label: string;
  component: JSX.Element;
};

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
  const tabs: TabConfig[] = [
    { icon: <Person />, label: "NPC", component: <NpcForm world={world} /> },
    { icon: <LibraryBooks />, label: "NPC Library", component: <NPCList /> },
    { icon: <MenuBook />, label: "Lore", component: <LoreForm world={world} /> },
    { icon: <TravelExplore />, label: "Quest", component: <QuestForm /> },
    { icon: <SportsKabaddi />, label: "Encounter", component: <EncounterForm /> },
    { icon: <Gavel />, label: "Rulebook", component: <RuleForm /> },
    { icon: <AutoStories />, label: "Spellbook", component: <SpellForm /> },
    { icon: <Casino />, label: "Dice", component: <DiceRoller /> },
    { icon: <Map />, label: "Tabletop", component: <TabletopMap /> },
    { icon: <MilitaryTech />, label: "War Table", component: <WarTable /> },
  ];
  return (
    <ThemeProvider theme={createDndTheme()}>
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
            {tabs.map(({ icon, label }, idx) => (
              <Tab key={idx} icon={icon} label={label} />
            ))}
          </Tabs>
          {tabs[tab]?.component}
        </>
      )}
      </Box>
    </ThemeProvider>
  );
}
