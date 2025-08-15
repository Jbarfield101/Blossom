import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  Link,
} from "@mui/material";

interface Article {
  title: string;
  link: string;
  summary: string;
  pub_date?: string;
  source: string;
}

export default function BigBrotherUpdates() {
  const [articles, setArticles] = useState<Article[]>(() => {
    const cached = localStorage.getItem("bigBrotherUpdates");
    return cached ? JSON.parse(cached) : [];
  });

  useEffect(() => {
    invoke<Article[]>("fetch_big_brother_news")
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
          <ListItem key={idx} divider alignItems="flex-start">
            <ListItemText
              primary={
                <Typography variant="h6" component="div">
                  {article.title}
                </Typography>
              }
              secondary={
                <>
                  <Typography variant="body2" color="text.primary">
                    {article.summary}
                  </Typography>
                  <Link
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read more
                  </Link>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {article.source}
                    {article.pub_date
                      ? ` - ${new Date(article.pub_date).toLocaleString()}`
                      : ""}
                  </Typography>
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
