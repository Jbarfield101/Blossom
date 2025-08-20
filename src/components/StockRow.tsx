import { memo, useEffect, useState } from "react";
import { Box, Typography, IconButton, ListItem } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import Sparkline from "./Sparkline";
import { useStocks } from "../store/stocks";

function StockRow({ symbol }: { symbol: string }) {
  const quote = useStocks((state) => state.quotes[symbol]);
  const removeStock = useStocks((state) => state.removeStock);
  const forecastFn = useStocks((state) => state.forecast);
  const fetchNews = useStocks((state) => state.fetchNews);
  const [forecast, setForecast] = useState<{ shortTerm: string; longTerm: string } | null>(null);
  const [newsSummary, setNewsSummary] = useState("");
  useEffect(() => {
    forecastFn(symbol).then(setForecast);
    fetchNews(symbol).then((articles) => {
      const summary = articles
        .slice(0, 3)
        .map((a) => a.title)
        .join("; ");
      setNewsSummary(summary);
    });
  }, [symbol, forecastFn, fetchNews]);
  const color = quote && quote.changePercent < 0 ? "#ff5252" : "#4caf50";

  return (
    <ListItem
      key={symbol}
      secondaryAction={
        <IconButton edge="end" onClick={() => removeStock(symbol)}>
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
              <>
                <Typography sx={{ width: 120, color }}>
                  {quote.price.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                </Typography>
                <Typography sx={{ width: 80 }}>{quote.marketStatus}</Typography>
                <Sparkline data={quote.history} color={color} />
              </>
            )
          ) : (
            <Typography sx={{ width: 120 }}>...</Typography>
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
