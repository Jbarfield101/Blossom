import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Box, Button, Stack, Typography } from "@mui/material";
import Center from "./_Center";

interface Article {
  id: number;
  title: string;
  summary: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function News() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [context, setContext] = useState<ChatMessage[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch("https://api.spaceflightnewsapi.net/v3/articles?_limit=5")
      .then((res) => res.json())
      .then((data) => setArticles(data));
  }, []);

  async function ask(article: Article) {
    const userMsg: ChatMessage = {
      role: "user",
      content: `${article.title}\n\n${article.summary}`,
    };
    const messages = [...context, userMsg];
    const reply: string = await invoke("general_chat", { messages });
    setContext([...messages, { role: "assistant", content: reply }]);
    setAnswers((prev) => ({ ...prev, [article.id]: reply }));
  }

  return (
    <Center>
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 600 }}>
        {articles.map((a) => (
          <Box
            key={a.id}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              p: 2,
              borderRadius: 1,
            }}
          >
            <Typography variant="h6" gutterBottom>
              {a.title}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {a.summary}
            </Typography>
            <Button variant="contained" onClick={() => ask(a)}>
              Ask about this
            </Button>
            {answers[a.id] && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {answers[a.id]}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    </Center>
  );
}

