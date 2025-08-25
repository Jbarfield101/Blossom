import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, List, ListItem, ListItemText, Typography } from "@mui/material";

interface LogEntry {
  timestamp: string;
  world: string;
  id: string;
  name: string;
}

export default function NpcLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  async function load() {
    try {
      const data = await invoke<LogEntry[]>("read_npc_log", { limit: 20 });
      setEntries(data);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <Typography variant="h6" sx={{ mt: 2 }}>
        NPC Import Log
      </Typography>
      <Button size="small" onClick={load} sx={{ mb: 1 }}>
        Refresh
      </Button>
      <List dense>
        {entries.length === 0 && (
          <ListItem>
            <ListItemText primary="No entries" />
          </ListItem>
        )}
        {entries.map((e, i) => (
          <ListItem key={i}>
            <ListItemText
              primary={`${e.name} (${e.world})`}
              secondary={new Date(e.timestamp).toLocaleString()}
            />
          </ListItem>
        ))}
      </List>
    </div>
  );
}
