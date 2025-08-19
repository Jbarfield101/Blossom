import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  List,
  ListItem,
  IconButton,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import Sparkline from "../components/Sparkline";
import { useStocks } from "../store/stocks";

export default function Stocks() {
  const [symbol, setSymbol] = useState("");
  const { symbols, quotes, addStock, removeStock } = useStocks();

  const handleAdd = () => {
    const sym = symbol.trim();
    if (sym) {
      addStock(sym);
      setSymbol("");
    }
  };

  return (
    <Box sx={{ p: 2, color: "#fff" }}>
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField
          label="Symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button variant="contained" onClick={handleAdd}>
          Add
        </Button>
      </Box>
      <List>
        {symbols.map((s) => {
          const q = quotes[s];
          const color = q && q.changePercent < 0 ? "#ff5252" : "#4caf50";
          return (
            <ListItem
              key={s}
              secondaryAction={
                <IconButton edge="end" onClick={() => removeStock(s)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                <Typography sx={{ width: 80 }}>{s}</Typography>
                {q ? (
                  <>
                    <Typography sx={{ width: 120, color }}>
                      {q.price.toFixed(2)} ({q.changePercent.toFixed(2)}%)
                    </Typography>
                    <Typography sx={{ width: 80 }}>{q.marketStatus}</Typography>
                    <Sparkline data={q.history} color={color} />
                  </>
                ) : (
                  <Typography sx={{ width: 120 }}>...</Typography>
                )}
              </Box>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

