import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
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
        />
        <Button variant="contained" onClick={handleAdd}>
          Add
        </Button>
      </Box>
      <List>
        {symbols.map((s) => (
          <ListItem
            key={s}
            secondaryAction={
              <IconButton edge="end" onClick={() => removeStock(s)}>
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemText primary={`${s}: ${quotes[s]?.price ?? "..."}`} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

