import { useState } from "react";
import { Box, Button, TextField, List } from "@mui/material";
import { useShallow } from "zustand/react/shallow";
import StockRow from "../components/StockRow";
import { useStocks } from "../store/stocks";

export default function Stocks() {
  const [symbol, setSymbol] = useState("");
  const { symbols, addStock } = useStocks(
    useShallow((state) => ({ symbols: state.symbols, addStock: state.addStock }))
  );

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
        {symbols.map((s) => (
          <StockRow key={s} symbol={s} />
        ))}
      </List>
    </Box>
  );
}

