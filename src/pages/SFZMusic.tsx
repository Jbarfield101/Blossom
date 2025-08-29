import { useState } from "react";
import { Tab, Tabs } from "@mui/material";
import SFZSongForm from "../components/SFZSongForm";
import BasicSfzGenerator from "../components/BasicSfzGenerator";
import TaskList from "../components/TaskQueue/TaskList";

export default function SFZMusic() {
  const [tab, setTab] = useState(0);

  return (
    <div style={{ padding: "2rem" }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Song Form" />
        <Tab label="Basic Generator" />
      </Tabs>
      {tab === 0 && <SFZSongForm />}
      {tab === 1 && <BasicSfzGenerator />}
      <TaskList />
    </div>
  );
}

