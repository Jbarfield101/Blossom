import Center from "./_Center";
import { useUsers } from "../features/users/useUsers";
import { Box, Typography, List, ListItem, ListItemText } from "@mui/material";
import BackButton from "../components/BackButton";

export default function User() {
  const user = useUsers((state) => {
    const id = state.currentUserId;
    return id ? state.users[id] : null;
  });

  if (!user) {
    return (
      <Center>
        <BackButton />
        No user selected
      </Center>
    );
  }

  return (
    <Center>
      <BackButton />
      <Box sx={{ textAlign: "left", maxWidth: 400 }}>
        <Typography variant="h4" gutterBottom>
          User Info
        </Typography>
        <Typography>
          <strong>ID:</strong> {user.id}
        </Typography>
        <Typography>
          <strong>Name:</strong> {user.name}
        </Typography>
        <Typography>
          <strong>Theme:</strong> {user.theme}
        </Typography>
        <Typography>
          <strong>Money:</strong> {user.money}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6">Modules</Typography>
          <List dense>
            {Object.entries(user.modules).map(([key, enabled]) => (
              <ListItem key={key}>
                <ListItemText primary={`${key}: ${enabled ? "on" : "off"}`} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Box>
    </Center>
  );
}
