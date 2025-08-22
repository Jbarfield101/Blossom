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
  volume: number;
  lastFetched: number;
  // Optional error message from backend
  error?: string;
}

interface NewsArticle {
  title: string;
  link: string;
  timestamp: number;
  summary: string;
}

interface Forecast {
  shortTerm: string;
  longTerm: string;
}

interface StockState {
  quotes: Record<string, Quote>;
  pollers: Record<string, ReturnType<typeof setInterval>>;
  ws: Record<string, WebSocket>;
  symbols: string[];
  news: Record<string, { articles: NewsArticle[]; lastFetched: number; error?: string }>;
  fetchQuote: (symbol: string) => Promise<number>;
  startPolling: (symbol: string, interval?: number) => void;
  stopPolling: (symbol: string) => void;
  startRealtime: (symbol: string) => void;
  stopRealtime: (symbol: string) => void;
  forecast: (symbol: string) => Promise<Forecast>;
  fetchNews: (symbol: string) => Promise<NewsArticle[]>;
  addStock: (symbol: string) => void;
  removeStock: (symbol: string) => void;
}

const WS_SYMBOL_MAP: Record<string, string> = {
  BTC: 'btcusdt',
  ETH: 'ethusdt',
};

export const useStocks = create<StockState>((set, get) => ({
  quotes: {},
  pollers: {},
  ws: {},
  symbols: [],
  news: {},
  fetchQuote: async (symbol) => {
    const sym = symbol.toUpperCase();
    const fetchSym = SYMBOL_MAP[sym] ?? sym;
    try {
      const bundle = await invoke<{
        quotes: { price: number; change_percent: number; status: string; volume?: number; error?: string }[];
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
            volume: quote?.volume ?? 0,
            history,
            marketStatus: market_status,
            lastFetched: Date.now(),
            error: quote?.error,
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
            volume: 0,
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
        news: {
          ...state.news,
          [sym]: { articles, lastFetched: Date.now(), error: undefined },
        },
      }));
      return articles;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set((state) => ({
        news: {
          ...state.news,
          [sym]: { articles: [], lastFetched: Date.now(), error: message },
        },
      }));
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
  startRealtime: (symbol) => {
    const sym = symbol.toUpperCase();
    const { ws } = get();
    if (ws[sym]) return;
    const pair = WS_SYMBOL_MAP[sym];
    if (!pair || !(globalThis as any).WebSocket) return;
    const socket = new WebSocket(`wss://stream.binance.com:9443/ws/${pair}@trade`);
    socket.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string);
        const price = parseFloat(data.p);
        set((state) => {
          const prev = state.quotes[sym];
          const prevPrice = prev?.price ?? price;
          const changePercent = prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0;
          return {
            quotes: {
              ...state.quotes,
              [sym]: {
                price,
                changePercent,
                volume: prev?.volume ?? 0,
                history: prev?.history ?? [],
                marketStatus: prev?.marketStatus ?? '',
                lastFetched: Date.now(),
                error: undefined,
              },
            },
          };
        });
      } catch {
        // ignore malformed messages
      }
    };
    socket.onclose = () => {
      set((state) => {
        const { [sym]: _, ...rest } = state.ws;
        return { ws: rest };
      });
    };
    set((state) => ({ ws: { ...state.ws, [sym]: socket } }));
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
  stopRealtime: (symbol) => {
    const sym = symbol.toUpperCase();
    const { ws } = get();
    const socket = ws[sym];
    if (socket) socket.close();
    set((state) => {
      const { [sym]: _, ...rest } = state.ws;
      return { ws: rest };
    });
  },
  forecast: async (symbol) => {
    const sym = symbol.toUpperCase();
    try {
      return await invoke<Forecast>('stock_forecast', { symbol: sym });
    } catch {
      return {
        shortTerm: 'Forecast currently unavailable.',
        longTerm: 'Forecast currently unavailable.',
      };
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
    get().startRealtime(sym);
  },
  removeStock: (symbol) => {
    const sym = symbol.toUpperCase();
    set((state) => ({ symbols: state.symbols.filter((s) => s !== sym) }));
    get().stopPolling(sym);
    get().stopRealtime(sym);
  },
}));

export type { Quote, StockState, NewsArticle, Forecast };
