import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Box, Button, Typography } from "@mui/material";
import { FiRefreshCcw } from "react-icons/fi";
import ArticleCard, { type Article } from "../components/ArticleCard";

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
    <Box sx={{ maxWidth: 1200, mx: "auto", px: 2, py: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Typography component="h1" variant="h4" fontWeight="bold">
          Big Brother Updates
        </Typography>
        <Button
          variant="contained"
          startIcon={<FiRefreshCcw />}
          onClick={() => fetchData(true)}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {articles.map((article, idx) => (
          <ArticleCard key={idx} article={article} />
        ))}
      </Box>
    </Box>
  );
}

