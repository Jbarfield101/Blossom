import { useState } from "react";
import { Button, List, ListItemButton, ListItemText, Tabs, Tab } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useShorts } from "../features/shorts/useShorts";
import TaskList from "../components/TaskQueue/TaskList";
import BackButton from "../components/BackButton";

export default function Shorts() {
  const { shorts, selectedId, create, select } = useShorts();
  const short = shorts.find((s) => s.id === selectedId) || null;
  const [tab, setTab] = useState(0);

  if (!short) {
    return (
      <>
        <BackButton />
        <div style={{ padding: 24 }}>
          <Button variant="contained" onClick={create} sx={{ mb: 2 }}>
            New Short
          </Button>
          <List>
            {shorts.map((s) => (
              <ListItemButton key={s.id} onClick={() => select(s.id)}>
                <ListItemText primary={s.title} secondary={s.status} />
              </ListItemButton>
            ))}
          </List>
          <TaskList />
        </div>
      </>
    );
  }

  return (
    <>
      <BackButton />
      <div style={{ padding: 24 }}>
        <Button onClick={() => select(null)} sx={{ mb: 2 }}>
          Back
        </Button>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Script" />
          <Tab label="Audio" />
          <Tab label="Visual" />
          <Tab label="Export" />
        </Tabs>
        {tab === 0 && <div style={{ marginTop: 16 }}>Script placeholder</div>}
        {tab === 1 && <div style={{ marginTop: 16 }}>Audio placeholder</div>}
        {tab === 2 && <div style={{ marginTop: 16 }}>Visual placeholder</div>}
        {tab === 3 && (
          <div style={{ marginTop: 16 }}>
            <Button
              variant="contained"
              onClick={async () => {
                await invoke("generate_short", { spec: short });
              }}
            >
              Generate
            </Button>
          </div>
        )}
        <TaskList />
      </div>
    </>
  );
}
