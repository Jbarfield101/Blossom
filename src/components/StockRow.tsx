import { memo, useEffect, useState, useRef } from "react";
import { Box, Typography, IconButton, ListItem, Skeleton, Fade } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import Sparkline from "./Sparkline";
import { useStocks } from "../store/stocks";

interface MetricConfig {
  price: boolean;
  change: boolean;
  volume: boolean;
  trend: boolean;
}

function StockRow({ symbol, metrics }: { symbol: string; metrics: MetricConfig }) {
  const quote = useStocks((state) => state.quotes[symbol]);
  const removeStock = useStocks((state) => state.removeStock);
  const [forecast, setForecast] = useState<{ shortTerm: string; longTerm: string } | null>(null);
  const [newsSummary, setNewsSummary] = useState("");
  const prevPrice = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    let mounted = true;
    const { forecast, fetchNews } = useStocks.getState();
    forecast(symbol).then((result) => {
      if (mounted) setForecast(result);
    });
    fetchNews(symbol).then((articles) => {
      if (!mounted) return;
      const summary = articles
        .slice(0, 3)
        .map((a) => a.title)
        .join("; ");
      setNewsSummary(summary);
    });
    return () => {
      mounted = false;
    };
  }, [symbol]);
  const color = quote && quote.changePercent < 0 ? "#ff5252" : "#4caf50";

  useEffect(() => {
    if (!quote) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (prevPrice.current !== null) {
      const dir = quote.price > prevPrice.current ? "up" : quote.price < prevPrice.current ? "down" : null;
      if (dir) {
        setFlash(dir);
        timeout = setTimeout(() => setFlash(null), 500);
      }
    }
    prevPrice.current = quote.price;
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [quote?.price]);

  return (
    <ListItem
      key={symbol}
      secondaryAction={
        <IconButton
          edge="end"
          onClick={() => removeStock(symbol)}
          aria-label={`Remove ${symbol}`}
        >
          <DeleteIcon />
        </IconButton>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography sx={{ width: 80 }}>{symbol}</Typography>
          {quote ? (
            quote.error ? (
              <Typography sx={{ width: 120, color: "#ff5252" }}>
                {quote.error}
              </Typography>
            ) : (
              <Fade in={!!quote}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  {metrics.price && (
                    <Typography
                      sx={{
                        width: 100,
                        color,
                        bgcolor:
                          flash === "up"
                            ? "rgba(76, 175, 80, 0.3)"
                            : flash === "down"
                              ? "rgba(255, 82, 82, 0.3)"
                              : "transparent",
                        transition: "background-color 0.5s",
                      }}
                    >
                      {quote.price.toFixed(2)}
                    </Typography>
                  )}
                  {metrics.change && (
                    <Typography sx={{ width: 100, color }}>
                      {quote.changePercent.toFixed(2)}%
                    </Typography>
                  )}
                  {metrics.volume && (
                    <Typography sx={{ width: 120 }}>
                      {quote.volume ? quote.volume.toLocaleString() : "N/A"}
                    </Typography>
                  )}
                  {metrics.trend && (
                    <Sparkline data={quote.history} color={color} />
                  )}
                </Box>
              </Fade>
            )
          ) : (
            <Skeleton variant="text" width={120} />
          )}
        </Box>
        {forecast && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="body2">Short: {forecast.shortTerm}</Typography>
            <Typography variant="body2">Long: {forecast.longTerm}</Typography>
          </Box>
        )}
        {newsSummary && (
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {newsSummary}
          </Typography>
        )}
      </Box>
    </ListItem>
  );
}

export default memo(StockRow);
