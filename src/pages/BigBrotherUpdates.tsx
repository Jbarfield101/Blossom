import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";

interface Article {
  title: string;
  timestamp: string;
}

export default function BigBrotherUpdates() {
  const [articles, setArticles] = useState<Article[]>(() => {
    const cached = localStorage.getItem("bigBrotherUpdates");
    return cached ? JSON.parse(cached) : [];
  });

  useEffect(() => {
    invoke<Article[]>("big_brother_updates")
      .then((data) => {
        setArticles(data);
        localStorage.setItem("bigBrotherUpdates", JSON.stringify(data));
      })
      .catch((err) => {
        console.error("Failed to fetch updates", err);
      });
  }, []);

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Big Brother Updates
      </Typography>
      <List>
        {articles.map((article, idx) => (
          <ListItem key={idx} divider>
            <ListItemText
              primary={article.title}
              secondary={new Date(article.timestamp).toLocaleString()}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
