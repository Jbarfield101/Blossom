import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Center from "./_Center";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
}

export default function GeneralChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"init" | "starting" | "ready" | "error">("init");
  const [error, setError] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("generalChatHistory");
    if (stored) {
      try {
        const parsed: Message[] = JSON.parse(stored);
        const now = Date.now();
        const tenDays = 10 * 24 * 60 * 60 * 1000;
        const pruned = parsed.filter((m) => now - m.ts < tenDays);
        setMessages(pruned);
        localStorage.setItem("generalChatHistory", JSON.stringify(pruned));
      } catch {
        // ignore
      }
    }

    const unlistenPromise = listen<string>("ollama_log", (e) => {
      setLogs((prev) => [...prev, e.payload]);
    });

    startEngine();

    return () => {
      unlistenPromise.then((f) => f());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEngine() {
    setStatus("starting");
    setLogs([]);
    try {
      await invoke("start_ollama");
      setStatus("ready");
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }

  async function send() {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input, ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const reply: string = await invoke("general_chat", {
        messages: newMessages.map(({ role, content }) => ({ role, content })),
      });
      const asst: Message = { role: "assistant", content: reply, ts: Date.now() };
      const updated = [...newMessages, asst];
      setMessages(updated);
      localStorage.setItem("generalChatHistory", JSON.stringify(updated));
    } catch (e) {
      setError(String(e));
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  if (status !== "ready") {
    return (
      <Center>
        <Stack spacing={2} sx={{ width: "100%", maxWidth: 500 }}>
          {status === "starting" && (
            <>
              <Typography>Starting local AI…</Typography>
              {logs.length > 0 && (
                <Box sx={{ maxHeight: 200, overflowY: "auto", bgcolor: "#000", color: "#0f0", p: 1 }}>
                  {logs.map((l, i) => (
                    <Typography key={i} variant="body2">
                      {l}
                    </Typography>
                  ))}
                </Box>
              )}
            </>
          )}
          {status === "error" && (
            <>
              <Typography color="error">{error}</Typography>
              <Button variant="contained" onClick={startEngine}>
                Restart local AI
              </Button>
            </>
          )}
        </Stack>
      </Center>
    );
  }

  return (
    <Center>
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 600, height: "100%" }}>
        <Box sx={{ flexGrow: 1, overflowY: "auto", width: "100%" }}>
          {messages.map((m, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                my: 1,
              }}
            >
              <Box
                sx={{
                  bgcolor: m.role === "user" ? "primary.main" : "grey.300",
                  color: m.role === "user" ? "primary.contrastText" : "text.primary",
                  borderRadius: 1,
                  p: 1,
                  maxWidth: "80%",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </Box>
            </Box>
          ))}
        </Box>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button variant="contained" onClick={send} disabled={loading}>
            Send
          </Button>
          {loading && <CircularProgress size={24} />}
        </Stack>
      </Stack>
    </Center>
  );
}
