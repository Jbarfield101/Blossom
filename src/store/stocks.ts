import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface Quote {
  price: number;
  changePercent: number;
  history: number[];
  marketStatus: string;
  lastFetched: number;
}

interface StockState {
  quotes: Record<string, Quote>;
  pollers: Record<string, ReturnType<typeof setInterval>>;
  symbols: string[];
  fetchQuote: (symbol: string) => Promise<number>;
  startPolling: (symbol: string, interval?: number) => void;
  stopPolling: (symbol: string) => void;
  forecast: (symbol: string) => Promise<string>;
  addStock: (symbol: string) => void;
  removeStock: (symbol: string) => void;
}

export const useStocks = create<StockState>((set, get) => ({
  quotes: {},
  pollers: {},
  symbols: [],
  fetchQuote: async (symbol) => {
    const sym = symbol.toUpperCase();
    const map: Record<string, string> = { BTC: 'BTC-USD', ETH: 'ETH-USD' };
    const fetchSym = map[sym] ?? sym;
    const { price, change_percent, history, market_status } = await invoke<{
      price: number;
      change_percent: number;
      history: number[];
      market_status: string;
    }>('stocks_fetch', { symbol: fetchSym });
    set((state) => ({
      quotes: {
        ...state.quotes,
        [sym]: {
          price,
          changePercent: change_percent,
          history,
          marketStatus: market_status,
          lastFetched: Date.now(),
        },
      },
    }));
    return price;
  },
  startPolling: (symbol, interval = 15000) => {
    const sym = symbol.toUpperCase();
    const { pollers } = get();
    if (pollers[sym]) clearInterval(pollers[sym]);
    const id = setInterval(() => {
      get().fetchQuote(sym);
    }, interval);
    set((state) => ({ pollers: { ...state.pollers, [sym]: id } }));
    get().fetchQuote(sym);
  },
  stopPolling: (symbol) => {
    const sym = symbol.toUpperCase();
    const { pollers } = get();
    const id = pollers[sym];
    if (id) clearInterval(id);
    set((state) => {
      const { [sym]: _, ...rest } = state.pollers;
      return { pollers: rest };
    });
  },
  forecast: async (symbol) => {
    const sym = symbol.toUpperCase();
    return invoke<string>('stock_forecast', { symbol: sym });
  },
  addStock: (symbol) => {
    const sym = symbol.toUpperCase();
    set((state) =>
      state.symbols.includes(sym)
        ? state
        : { symbols: [...state.symbols, sym] }
    );
    get().startPolling(sym);
  },
  removeStock: (symbol) => {
    const sym = symbol.toUpperCase();
    set((state) => ({ symbols: state.symbols.filter((s) => s !== sym) }));
    get().stopPolling(sym);
  },
}));

export type { Quote, StockState };
