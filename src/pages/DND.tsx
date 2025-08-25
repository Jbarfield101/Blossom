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
import {
  DndThemeContext,
  themes,
  themeStyles,
  tabColors,
  ACCENT_COLOR,
} from "../features/dnd/theme";
import type { DndTheme } from "../features/dnd/types";
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

export default function DND() {
  const [tab, setTab] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<DndTheme>("Parchment");
  const worlds = useWorlds((s) => s.worlds);
  const world = useWorlds((s) => s.currentWorld);
  const addWorld = useWorlds((s) => s.addWorld);
  const setCurrentWorld = useWorlds((s) => s.setCurrentWorld);
  const handleChange = (_e: SyntheticEvent, v: number) => setTab(v);
  const handleWorldChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "__new__") {
      const name = window.prompt("Enter world name")?.trim();
      if (name) {
        addWorld(name);
        setCurrentWorld(name);
      }
    } else {
      setCurrentWorld(value);
    }
  };
  const activeTabSx = {
    "&.Mui-selected": {
      color: ACCENT_COLOR,
    },
    "&.Mui-selected svg": {
      color: ACCENT_COLOR,
    },
  } as const;
  return (
    <DndThemeContext.Provider value={selectedTheme}>
      <Box sx={{ p: 2 }} style={themeStyles[selectedTheme]}>
        <Box sx={{ my: 2, maxWidth: 200, mx: "auto" }}>
          <TextField
            select
            label="World"
            value={world}
            onChange={handleWorldChange}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                borderColor: ACCENT_COLOR,
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: ACCENT_COLOR,
              },
            }}
          >
            {worlds.map((w) => (
              <MenuItem key={w} value={w}>
                {w}
              </MenuItem>
            ))}
            <MenuItem value="__new__">Create New World</MenuItem>
          </TextField>
        </Box>
        {world && (
          <>
            <Tabs
              value={tab}
              onChange={handleChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                bgcolor: tabColors[selectedTheme],
                "& .MuiTabs-indicator": {
                  backgroundColor: ACCENT_COLOR,
                },
              }}
            >
              <Tab icon={<Person />} label="NPC" sx={activeTabSx} />
              <Tab icon={<LibraryBooks />} label="NPC Library" sx={activeTabSx} />
              <Tab icon={<MenuBook />} label="Lore" sx={activeTabSx} />
              <Tab icon={<TravelExplore />} label="Quest" sx={activeTabSx} />
              <Tab icon={<SportsKabaddi />} label="Encounter" sx={activeTabSx} />
              <Tab icon={<Gavel />} label="Rulebook" sx={activeTabSx} />
              <Tab icon={<AutoStories />} label="Spellbook" sx={activeTabSx} />
              <Tab icon={<Casino />} label="Dice" sx={activeTabSx} />
              <Tab icon={<Map />} label="Tabletop" sx={activeTabSx} />
              <Tab icon={<MilitaryTech />} label="War Table" sx={activeTabSx} />
            </Tabs>
            <Box sx={{ my: 2, maxWidth: 200 }}>
              <TextField
                select
                label="Theme"
                value={selectedTheme}
                onChange={(e) =>
                  setSelectedTheme(e.target.value as DndTheme)
                }
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                    borderColor: ACCENT_COLOR,
                  },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: ACCENT_COLOR,
                  },
                }}
              >
                {themes.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
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
    </DndThemeContext.Provider>
  );
}
