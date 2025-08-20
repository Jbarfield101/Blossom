import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

const SYMBOL_MAP: Record<string, string> = {
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
};

interface Quote {
  price: number;
  changePercent: number;
  history: number[];
  marketStatus: string;
  lastFetched: number;
  error?: string;
}

interface NewsArticle {
  title: string;
  link: string;
  timestamp: number;
  summary: string;
}

interface StockState {
  quotes: Record<string, Quote>;
  pollers: Record<string, ReturnType<typeof setInterval>>;
  symbols: string[];
  news: Record<string, { articles: NewsArticle[]; lastFetched: number }>;
  fetchQuote: (symbol: string) => Promise<number>;
  startPolling: (symbol: string, interval?: number) => void;
  stopPolling: (symbol: string) => void;
  forecast: (symbol: string) => Promise<string>;
  fetchNews: (symbol: string) => Promise<NewsArticle[]>;
  addStock: (symbol: string) => void;
  removeStock: (symbol: string) => void;
}

export const useStocks = create<StockState>((set, get) => ({
  quotes: {},
  pollers: {},
  symbols: [],
  news: {},
  fetchQuote: async (symbol) => {
    const sym = symbol.toUpperCase();
    const fetchSym = SYMBOL_MAP[sym] ?? sym;
    try {
      const bundle = await invoke<{
        quotes: { price: number; change_percent: number; status: string }[];
        series: { points: { ts: number; close: number }[] }[];
        market: { phase: string };
        stale: boolean;
      }>('stocks_fetch', { tickers: [fetchSym], range: '1d' });
      const quote = bundle.quotes[0];
      const series = bundle.series[0];
      const history = series?.points?.map((p) => p.close) ?? [];
      const market_status = bundle.market.phase;
      set((state) => ({
        quotes: {
          ...state.quotes,
          [sym]: {
            price: quote?.price ?? 0,
            changePercent: quote?.change_percent ?? 0,
            history,
            marketStatus: market_status,
            lastFetched: Date.now(),
            error: undefined,
          },
        },
      }));
      return quote?.price ?? NaN;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set((state) => {
        const prev =
          state.quotes[sym] ?? {
            price: NaN,
            changePercent: NaN,
            history: [],
            marketStatus: '',
            lastFetched: Date.now(),
          };
        return {
          quotes: {
            ...state.quotes,
            [sym]: { ...prev, error: message, lastFetched: Date.now() },
          },
        };
      });
      return NaN;
    }
  },
  fetchNews: async (symbol) => {
    const sym = symbol.toUpperCase();
    const cached = get().news[sym];
    if (cached && Date.now() - cached.lastFetched < 15 * 60 * 1000) {
      return cached.articles;
    }
    try {
      const articles = await invoke<NewsArticle[]>('fetch_stock_news', {
        symbol: sym,
      });
      set((state) => ({
        news: { ...state.news, [sym]: { articles, lastFetched: Date.now() } },
      }));
      return articles;
    } catch {
      return [];
    }
  },
  startPolling: (symbol, interval = 15000) => {
    const sym = symbol.toUpperCase();
    const { pollers } = get();
    if (pollers[sym]) return;
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
    try {
      return await invoke<string>('stock_forecast', { symbol: sym });
    } catch {
      return 'Forecast currently unavailable.';
    }
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

export type { Quote, StockState, NewsArticle };
