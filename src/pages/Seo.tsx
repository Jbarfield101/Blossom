import { useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import Center from "./_Center";
import { generatePrompt } from "../utils/promptGenerator";
import BackButton from "../components/BackButton";

function generateMetaTags(keywords: string[], content: string) {
  const description = content.trim().slice(0, 160);
  const keywordStr = keywords.join(", ");
  return `<meta name="description" content="${description}" />\n<meta name="keywords" content="${keywordStr}" />`;
}

function suggestKeywords(content: string) {
  const words = (content.toLowerCase().match(/\b\w+\b/g) || []).filter(
    (w) => w.length > 3
  );
  const freq: Record<string, number> = {};
  words.forEach((w) => {
    freq[w] = (freq[w] || 0) + 1;
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
}

function seoScore(keywords: string[], content: string) {
  if (!keywords.length || !content.trim()) return 0;
  const lower = content.toLowerCase();
  const totalWords = lower.split(/\s+/).length;
  let matches = 0;
  keywords.forEach((k) => {
    const regex = new RegExp(`\\b${k.toLowerCase()}\\b`, "g");
    matches += (lower.match(regex) || []).length;
  });
  return Math.round((matches / totalWords) * 100);
}

export default function Seo() {
  const [keywords, setKeywords] = useState("");
  const [content, setContent] = useState("");
  const [meta, setMeta] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [copySuggestion, setCopySuggestion] = useState("");

  const analyze = () => {
    const kw = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    setMeta(generateMetaTags(kw, content));
    setSuggestions(suggestKeywords(content));
    setScore(seoScore(kw, content));
  };

  const suggestCopy = () => {
    const base = content || keywords;
    setCopySuggestion(generatePrompt(base, "seo"));
  };

  return (
    <Center>
      <BackButton />
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 600 }}>
        <TextField
          label="Target Keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
        <TextField
          label="Content"
          multiline
          minRows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={analyze}>
            Analyze
          </Button>
          <Button variant="outlined" onClick={suggestCopy}>
            Suggest Copy
          </Button>
        </Stack>
        {meta && (
          <Box>
            <Typography variant="h6">Meta Tags</Typography>
            <pre>{meta}</pre>
          </Box>
        )}
        {suggestions.length > 0 && (
          <Box>
            <Typography variant="h6">Keyword Suggestions</Typography>
            <Typography>{suggestions.join(", ")}</Typography>
          </Box>
        )}
        {score !== null && (
          <Typography variant="h6">SEO Score: {score}</Typography>
        )}
        {copySuggestion && (
          <Box>
            <Typography variant="h6">Copy Suggestion</Typography>
            <Typography>{copySuggestion}</Typography>
          </Box>
        )}
      </Stack>
    </Center>
  );
}
