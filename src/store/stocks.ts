import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface Quote {
  price: number;
  lastFetched: number;
}

interface StockState {
  quotes: Record<string, Quote>;
  pollers: Record<string, ReturnType<typeof setInterval>>;
  fetchQuote: (symbol: string, force?: boolean) => Promise<number>;
  startPolling: (symbol: string, interval?: number) => void;
  stopPolling: (symbol: string) => void;
  forecast: (symbol: string) => Promise<string>;
}

export const useStocks = create<StockState>((set, get) => ({
  quotes: {},
  pollers: {},
  fetchQuote: async (symbol, force = false) => {
    const sym = symbol.toUpperCase();
    const existing = get().quotes[sym];
    if (!force && existing && Date.now() - existing.lastFetched < 60000) {
      return existing.price;
    }
    const price = await invoke<number>('fetch_stock_quote', { symbol: sym, force });
    set((state) => ({
      quotes: { ...state.quotes, [sym]: { price, lastFetched: Date.now() } },
    }));
    return price;
  },
  startPolling: (symbol, interval = 60000) => {
    const sym = symbol.toUpperCase();
    const { pollers } = get();
    if (pollers[sym]) clearInterval(pollers[sym]);
    const id = setInterval(() => {
      get().fetchQuote(sym, true);
    }, interval);
    set((state) => ({ pollers: { ...state.pollers, [sym]: id } }));
    get().fetchQuote(sym, true);
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
}));

export type { Quote, StockState };
