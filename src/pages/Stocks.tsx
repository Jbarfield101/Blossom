import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  List,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useShallow } from "zustand/react/shallow";
import StockRow from "../components/StockRow";
import { useStocks } from "../store/stocks";

export default function Stocks() {
  const [symbol, setSymbol] = useState("");
  const defaultMetrics = { price: true, change: true, volume: true, trend: true };
  const [metrics, setMetrics] = useState(() => {
    const saved = localStorage.getItem("stockMetrics");
    return saved ? { ...defaultMetrics, ...JSON.parse(saved) } : defaultMetrics;
  });
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

  const toggleMetric = (key: keyof typeof defaultMetrics) => {
    setMetrics((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("stockMetrics", JSON.stringify(next));
      return next;
    });
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
      <FormGroup row sx={{ mb: 2 }}>
        <FormControlLabel
          control={<Checkbox checked={metrics.price} onChange={() => toggleMetric("price")} />}
          label="Price"
        />
        <FormControlLabel
          control={<Checkbox checked={metrics.change} onChange={() => toggleMetric("change")} />}
          label="% Change"
        />
        <FormControlLabel
          control={<Checkbox checked={metrics.volume} onChange={() => toggleMetric("volume")} />}
          label="Volume"
        />
        <FormControlLabel
          control={<Checkbox checked={metrics.trend} onChange={() => toggleMetric("trend")} />}
          label="Trend"
        />
      </FormGroup>
      <List>
        {symbols.map((s) => (
          <StockRow key={s} symbol={s} metrics={metrics} />
        ))}
      </List>
    </Box>
  );
}

