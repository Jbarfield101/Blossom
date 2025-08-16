import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import { useState } from "react";
import { useCalendar } from "../features/calendar/useCalendar";
import { Theme, useTheme } from "../features/theme/ThemeContext";
import { useSettings } from "../features/settings/useSettings";
import { useUsers } from "../features/users/useUsers";
import { useComfy } from "../features/comfy/useComfy";
import { useOutput } from "../features/output/useOutput";
import { open } from "@tauri-apps/plugin-dialog";
import { useDocs } from "../features/docs/useDocs";
import { TrashIcon } from "@heroicons/react/24/outline";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { events, selectedCountdownId, setSelectedCountdownId } = useCalendar();
  const { modules, toggleModule } = useSettings();
  const { users, currentUserId, addUser, switchUser } = useUsers();
  const { folder: comfyFolder, setFolder: setComfyFolder } = useComfy();
  const { folder: outputFolder, setFolder: setOutputFolder } = useOutput();
  const { docs, addDoc, removeDoc } = useDocs();
  const [newUser, setNewUser] = useState("");
  const userList = Object.values(users);
  const countdownEvents = events.filter(
    (e) => e.hasCountdown && e.status !== "canceled" && e.status !== "missed"
  );
  return (
    <Box sx={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, minWidth: 360 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>Settings</Typography>
        <Typography variant="body2" color="text.secondary">
          Put toggles, theme, and module switches here.
        </Typography>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="user-label">User</InputLabel>
          <Select
            labelId="user-label"
            label="User"
            value={currentUserId ?? ""}
            onChange={(e) => switchUser(e.target.value as string)}
          >
            {userList.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
          <TextField
            label="New User"
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={() => {
              const name = newUser.trim();
              if (name) {
                addUser(name);
                setNewUser("");
              }
            }}
          >
            Add
          </Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          {(
            [
              ["objects", "3D Objects"],
              ["music", "Lo-Fi Music"],
              ["calendar", "Calendar"],
              ["comfy", "ComfyUI"],
              ["assistant", "AI Assistant"],
              ["laser", "Laser Lab"],
              ["dnd", "DND"],
            ] as const
          ).map(([key, label]) => (
            <FormControlLabel
              key={key}
              control={
                <Switch
                  checked={modules[key]}
                  onChange={() => toggleModule(key)}
                />
              }
              label={label}
            />
          ))}
        </Box>
        <Box sx={{ mt: 3 }}>
          <TextField
            label="ComfyUI Folder"
            value={comfyFolder}
            onChange={(e) => setComfyFolder(e.target.value)}
            fullWidth
          />
          <Button
            variant="outlined"
            sx={{ mt: 1 }}
            onClick={async () => {
              const dir = await open({ directory: true });
              if (typeof dir === "string") setComfyFolder(dir);
            }}
          >
            Browse
          </Button>
        </Box>
        <Box sx={{ mt: 3 }}>
          <TextField
            label="Output Folder"
            value={outputFolder}
            onChange={(e) => setOutputFolder(e.target.value)}
            fullWidth
          />
          <Button
            variant="outlined"
            sx={{ mt: 1 }}
            onClick={async () => {
              const dir = await open({ directory: true });
              if (typeof dir === "string") setOutputFolder(dir);
            }}
          >
            Browse
          </Button>
        </Box>
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Documents
          </Typography>
          <Button
            variant="outlined"
            onClick={async () => {
              const file = await open({
                filters: [{ name: "PDF", extensions: ["pdf"] }],
              });
              if (typeof file === "string") {
                addDoc(file);
              }
            }}
          >
            Add PDF
          </Button>
          <List>
            {docs.map((d) => (
              <ListItem
                key={d.doc_id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => removeDoc(d.doc_id)}>
                    <TrashIcon width={20} />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={d.title || d.doc_id}
                  secondary={d.pages ? `Pages: ${d.pages}` : undefined}
                />
              </ListItem>
            ))}
          </List>
        </Box>
        <FormControl fullWidth sx={{ mt: 3 }}>
          <InputLabel id="theme-label">Theme</InputLabel>
          <Select
            labelId="theme-label"
            label="Theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
          >
            <MenuItem value="default">Default</MenuItem>
            <MenuItem value="ocean">Ocean</MenuItem>
            <MenuItem value="forest">Forest</MenuItem>
            <MenuItem value="sunset">Sunset</MenuItem>
            <MenuItem value="sakura">Sakura</MenuItem>
          </Select>
        </FormControl>
        {countdownEvents.length > 0 && (
          <FormControl fullWidth sx={{ mt: 3 }}>
            <InputLabel id="countdown-label">Home Countdown</InputLabel>
            <Select
              labelId="countdown-label"
              label="Home Countdown"
              value={selectedCountdownId ?? ""}
              onChange={(e) =>
                setSelectedCountdownId(e.target.value ? String(e.target.value) : null)
              }
            >
              <MenuItem value="">None</MenuItem>
              {countdownEvents.map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Paper>
    </Box>
  );
}
