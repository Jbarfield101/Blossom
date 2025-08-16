import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Box,
  Button,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { FiRefreshCcw } from "react-icons/fi";

interface Article {
  title: string;
  link: string;
  pub_date?: string;
  source: string;
  summary?: string;
  tags: string[];
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr).getTime();
  const diff = Date.now() - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function BigBrotherUpdates() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const data = await invoke<Article[]>("fetch_big_brother_news", { force });
      setArticles(data);
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRetry = () => fetchData(true);

  const openLink = (link: string) => {
    window.open(link, "_blank", "noopener,noreferrer");
  };

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

      {loading && (
        <Stack spacing={2}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{ border: 1, borderColor: "divider", p: 2, borderRadius: 2 }}
            >
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="rectangular" height={60} sx={{ mt: 1 }} />
            </Box>
          ))}
        </Stack>
      )}

      {!loading && error && (
        <Stack spacing={2} alignItems="flex-start">
          <Typography color="error">Failed to load updates.</Typography>
          <Button variant="outlined" onClick={handleRetry} startIcon={<FiRefreshCcw />}>
            Retry
          </Button>
        </Stack>
      )}

      {!loading && !error && articles.length === 0 && (
        <Typography>No updates available right now.</Typography>
      )}

      {!loading && !error && (
        <Stack spacing={2}>
          {articles.map((a) => (
            <Box
              key={a.link}
              onClick={() => openLink(a.link)}
              tabIndex={0}
              role="link"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openLink(a.link);
                }
              }}
              sx={{
                p: 2,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                cursor: "pointer",
                transition: "box-shadow 0.2s, transform 0.2s, border-color 0.2s",
                '&:hover': {
                  boxShadow: 3,
                  borderColor: 'primary.main',
                  '& a': { textDecoration: 'underline' },
                  transform: 'translateY(-2px)',
                },
                '&:active': {
                  transform: 'scale(0.98)',
                },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                },
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                {a.title}
              </Typography>
              {a.summary && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {a.summary}
                </Typography>
              )}
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ color: "text.secondary", fontSize: 14, flexWrap: 'wrap' }}
              >
                <img
                  src={`https://www.google.com/s2/favicons?domain=${new URL(a.link).origin}`}
                  width={16}
                  height={16}
                  style={{ marginRight: 4 }}
                />
                <span>{a.source}</span>
                {a.pub_date && (
                  <span>
                    • {formatDate(a.pub_date)} ({timeAgo(a.pub_date)})
                  </span>
                )}
              </Stack>
              {a.tags.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {a.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ))}
                </Box>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
