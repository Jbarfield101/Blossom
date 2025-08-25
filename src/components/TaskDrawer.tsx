import { Drawer, Box, Typography } from "@mui/material";
import TaskList from "./TaskQueue/TaskList";

interface TaskDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function TaskDrawer({ open, onClose }: TaskDrawerProps) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 360, p: 2 }} role="presentation">
        <Typography variant="h6" sx={{ mb: 1 }}>
          Task Queue
        </Typography>
        <TaskList />
      </Box>
    </Drawer>
  );
}

