import { useState } from "react";
import { Box, IconButton, Stack, TextField, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export default function HomeChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: trimmed,
    };
    const asstMsg: Message = {
      id: Date.now() + 1,
      role: "assistant",
      content: "Assistant features are not connected yet.",
    };
    setMessages((prev) => [...prev, userMsg, asstMsg]);
    setInput("");
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        width: 320,
        bgcolor: "rgba(0,0,0,0.7)",
        color: "#fff",
        p: 2,
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {messages.map((m) => (
          <Typography
            key={m.id}
            sx={{ mb: 1, textAlign: m.role === "user" ? "right" : "left" }}
          >
            {m.content}
          </Typography>
        ))}
      </Box>
      <Stack direction="row" spacing={1}>
        <TextField
          value={input}
          onChange={(e) => setInput(e.target.value)}
          size="small"
          fullWidth
          placeholder="Ask Blossom..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          InputProps={{ sx: { bgcolor: "#fff", borderRadius: 1 } }}
        />
        <IconButton color="primary" onClick={send}>
          <SendIcon />
        </IconButton>
      </Stack>
    </Box>
  );
}

