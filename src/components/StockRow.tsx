import { memo } from "react";
import { Box, Typography, IconButton, ListItem } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import Sparkline from "./Sparkline";
import { useStocks } from "../store/stocks";

function StockRow({ symbol }: { symbol: string }) {
  const quote = useStocks((state) => state.quotes[symbol]);
  const removeStock = useStocks((state) => state.removeStock);
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
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
        <Typography sx={{ width: 80 }}>{symbol}</Typography>
        {quote ? (
          <>
            <Typography sx={{ width: 120, color }}>
              {quote.price.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
            </Typography>
            <Typography sx={{ width: 80 }}>{quote.marketStatus}</Typography>
            <Sparkline data={quote.history} color={color} />
          </>
        ) : (
          <Typography sx={{ width: 120 }}>...</Typography>
        )}
      </Box>
    </ListItem>
  );
}

export default memo(StockRow);
