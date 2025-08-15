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
  link: string;
  pub_date?: string;
  source: string;
  summary?: string;
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
              secondary={
                <>
                  {`${article.source}${
                    article.pub_date
                      ? ` - ${new Date(article.pub_date).toLocaleString()}`
                      : ""
                  }`}
                  {article.summary && (
                    <>
                      <br />
                      {article.summary}
                    </>
                  )}
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
