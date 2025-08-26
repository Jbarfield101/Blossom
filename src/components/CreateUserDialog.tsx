import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from "@mui/material";
import { useState } from "react";
import { useUsers } from "../features/users/useUsers";

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateUserDialog({ open, onClose }: CreateUserDialogProps) {
  const addUser = useUsers((s) => s.addUser);
  const [name, setName] = useState("");

  const handleCreate = () => {
    if (name.trim()) {
      addUser(name.trim());
      setName("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Create New User</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreate} variant="contained" disabled={!name.trim()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
