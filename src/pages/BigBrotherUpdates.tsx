import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";

interface Article {
  title: string;
  link: string;
  pub_date?: string;
  source: string;
}

export default function BigBrotherUpdates() {
  const [articles, setArticles] = useState<Article[]>(() => {
    const cached = localStorage.getItem("bigBrotherUpdates");
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(false);

  const fetchData = async (force = false) => {
    setLoading(true);
    try {
      const data = await invoke<Article[]>("fetch_big_brother_news", { force });
      setArticles(data);
      localStorage.setItem("bigBrotherUpdates", JSON.stringify(data));
      localStorage.setItem(
        "bigBrotherUpdatesTimestamp",
        Date.now().toString()
      );
    } catch (err) {
      console.error("Failed to fetch updates", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const last = localStorage.getItem("bigBrotherUpdatesTimestamp");
    if (!last || Date.now() - parseInt(last, 10) > 3600 * 1000) {
      fetchData();
    }
  }, []);

  return (
    <Box p={2}>
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h5" gutterBottom sx={{ flexGrow: 1 }}>
          Big Brother Updates
        </Typography>
        <Button
          variant="contained"
          onClick={() => fetchData(true)}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      <List>
        {articles.map((article, idx) => (
          <ListItem
            key={idx}
            divider
            component="a"
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ListItemText
              primary={article.title}
              secondary={`${article.source}${
                article.pub_date
                  ? ` - ${new Date(article.pub_date).toLocaleString()}`
                  : ""
              }`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
