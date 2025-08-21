import { useState, useRef, useEffect } from "react";
import { Box, IconButton, Stack, TextField, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import Draggable from "react-draggable";
import { nanoid } from "nanoid";
import { invoke } from "@tauri-apps/api/core";
import { PRESET_TEMPLATES } from "./SongForm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function HomeChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const userMsg: Message = { id: nanoid(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    let reply = "";
    try {
      if (trimmed.toLowerCase().startsWith("/music")) {
        const args = trimmed.slice(6).trim();
        const templateMatch = args.match(/template=("[^"]+"|[^\s]+)/i);
        const trackMatch = args.match(/tracks=(\d+)/i);
        const template = templateMatch
          ? templateMatch[1].replace(/^"|"$/g, "")
          : undefined;
        const trackCount = trackMatch ? Number(trackMatch[1]) : undefined;
        const title = args
          .replace(/template=("[^"]+"|[^\s]+)/i, "")
          .replace(/tracks=\d+/i, "")
          .trim() || "untitled";

        if (!template || !trackCount) {
          const templates = Object.keys(PRESET_TEMPLATES).join(", ");
          reply =
            `Please specify template and track count.\n` +
            `Templates: ${templates}\n` +
            `Example: /music My Song template="Classic Lofi" tracks=3`;
        } else {
          await invoke("generate_album", {
            meta: { track_count: trackCount, title_base: title, template },
          });
          const plural = trackCount === 1 ? "track" : "tracks";
          reply = `Started music generation for "${title}" using "${template}" with ${trackCount} ${plural}.`;
        }
      } else {
        const history = [...messages, userMsg].map(({ role, content }) => ({
          role,
          content,
        }));
        reply = await invoke<string>("general_chat", { messages: history });
      }
    } catch (e: any) {
      reply = String(e);
    } finally {
      setLoading(false);
    }
    const asstMsg: Message = { id: nanoid(), role: "assistant", content: reply };
    setMessages((prev) => [...prev, asstMsg]);
  };

  return (
    <Draggable nodeRef={nodeRef} handle=".homechat-handle">
      <Box
        ref={nodeRef}
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
        <Box
          className="homechat-handle"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "move",
          }}
        >
          <Typography variant="subtitle1">Chat</Typography>
          <IconButton
            size="small"
            onClick={() => setMinimized((m) => !m)}
            aria-label={minimized ? "Expand" : "Collapse"}
          >
            {minimized ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        {!minimized && (
          <>
            <Box ref={scrollRef} sx={{ flex: 1, overflowY: "auto" }}>
              {messages.map((m) => (
                <Typography
                  key={m.id}
                  sx={{
                    mb: 1,
                    textAlign: m.role === "user" ? "right" : "left",
                  }}
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
              <IconButton
                color="primary"
                onClick={send}
                disabled={loading}
                aria-label="Send"
              >
                <SendIcon />
              </IconButton>
            </Stack>
          </>
        )}
      </Box>
    </Draggable>
  );
}

