import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Box, Button, Typography } from "@mui/material";
import { FiRefreshCcw } from "react-icons/fi";

export default function BigBrotherUpdates() {
  const [summary, setSummary] = useState(() => {
    return localStorage.getItem("bigBrotherSummary") || "";
  });
  const [loading, setLoading] = useState(false);

  const fetchData = async (force = false) => {
    setLoading(true);
    try {
      const data = await invoke<string>("fetch_big_brother_summary", { force });
      setSummary(data);
      localStorage.setItem("bigBrotherSummary", data);
      localStorage.setItem("bigBrotherSummaryTimestamp", Date.now().toString());
    } catch (err) {
      console.error("Failed to fetch summary", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const last = localStorage.getItem("bigBrotherSummaryTimestamp");
    if (!last || Date.now() - parseInt(last, 10) > 86400 * 1000) {
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
      {summary && (
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: "background.paper",
            color: "text.primary",
            border: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
            {summary}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

