import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStocks } from './stocks';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('useStocks store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStocks.setState({ quotes: {}, pollers: {}, ws: {}, symbols: [], news: {} });
  });

  afterEach(() => {
    const { pollers, stopPolling, ws, stopRealtime } = useStocks.getState();
    Object.keys(pollers).forEach((s) => stopPolling(s));
    Object.keys(ws).forEach((s) => stopRealtime(s));
    useStocks.setState({ symbols: [], news: {}, ws: {} });
    vi.useRealTimers();
  });

  it('fetches quotes through the backend', async () => {
    (invoke as any).mockResolvedValue({
      quotes: [{ price: 123, change_percent: 1, status: 'OPEN', volume: 1000 }],
      series: [{ points: [{ close: 1 }, { close: 2 }, { close: 3 }] }],
      market: { phase: 'OPEN' },
      stale: false,
    });
    const price = await useStocks.getState().fetchQuote('AAPL');
    expect(price).toBe(123);
    expect(invoke).toHaveBeenCalledWith('stocks_fetch', { tickers: ['AAPL'], range: '1d' });
  });

  it('captures quote errors from the backend', async () => {
    (invoke as any).mockResolvedValue({
      quotes: [{ price: 0, change_percent: 0, status: 'CLOSED', volume: 0, error: 'fail' }],
      series: [{ points: [] }],
      market: { phase: 'CLOSED' },
      stale: false,
    });
    const price = await useStocks.getState().fetchQuote('AAPL');
    expect(Number.isNaN(price)).toBe(true);
    expect(useStocks.getState().quotes['AAPL'].error).toBe('fail');
  });

  it('stores an error when backend call fails', async () => {
    (invoke as any).mockRejectedValue(new Error('boom'));
    const price = await useStocks.getState().fetchQuote('AAPL');
    expect(Number.isNaN(price)).toBe(true);
    expect(useStocks.getState().quotes['AAPL'].error).toBe('boom');
  });

  it('polls for updates when started', async () => {
    vi.useFakeTimers();
    (invoke as any).mockResolvedValue({
      quotes: [{ price: 100, change_percent: 0, status: 'CLOSED', volume: 0 }],
      series: [{ points: [{ close: 100 }] }],
      market: { phase: 'CLOSED' },
      stale: false,
    });
    const store = useStocks.getState();
    store.startPolling('MSFT', 1000);
    await vi.advanceTimersByTimeAsync(3100);
    store.stopPolling('MSFT');
    expect(invoke).toHaveBeenCalledTimes(4);
  });

  it('ignores duplicate polling requests', async () => {
    vi.useFakeTimers();
    (invoke as any).mockResolvedValue({
      quotes: [{ price: 100, change_percent: 0, status: 'CLOSED', volume: 0 }],
      series: [{ points: [{ close: 100 }] }],
      market: { phase: 'CLOSED' },
      stale: false,
    });
    const store = useStocks.getState();
    store.startPolling('MSFT', 1000);
    store.startPolling('MSFT', 1000);
    await vi.advanceTimersByTimeAsync(2100);
    store.stopPolling('MSFT');
    expect(invoke).toHaveBeenCalledTimes(3);
  });

  it('updates quotes from realtime stream', async () => {
    class MockWebSocket {
      static instance: MockWebSocket;
      onmessage: ((ev: { data: string }) => void) | null = null;
      onclose: (() => void) | null = null;
      constructor() {
        MockWebSocket.instance = this;
      }
      close() {
        this.onclose && this.onclose();
      }
    }
    (globalThis as any).WebSocket = MockWebSocket as any;

    useStocks.setState({
      quotes: {
        BTC: {
          price: 100,
          changePercent: 0,
          history: [],
          marketStatus: '',
          volume: 0,
          lastFetched: Date.now(),
        },
      },
    } as any);

    const store = useStocks.getState();
    store.startRealtime('BTC');
    MockWebSocket.instance.onmessage?.({ data: JSON.stringify({ p: '105' }) });
    await Promise.resolve();
    expect(useStocks.getState().quotes['BTC'].price).toBe(105);
    store.stopRealtime('BTC');
  });

  it('requests a forecast from the backend', async () => {
    (invoke as any).mockResolvedValue({ shortTerm: 'Up', longTerm: 'Down' });
    const result = await useStocks.getState().forecast('goog');
    expect(result).toEqual({ shortTerm: 'Up', longTerm: 'Down' });
    expect(invoke).toHaveBeenCalledWith('stock_forecast', { symbol: 'GOOG' });
  });

  it('returns a friendly message when forecast fails', async () => {
    (invoke as any).mockRejectedValue(new Error('fail'));
    const result = await useStocks.getState().forecast('goog');
    expect(result.shortTerm).toBe('Forecast currently unavailable.');
    expect(result.longTerm).toBe('Forecast currently unavailable.');
    expect(invoke).toHaveBeenCalledWith('stock_forecast', { symbol: 'GOOG' });
  });

  it('fetches and caches news', async () => {
    const articles = [{ title: 't', link: 'l', timestamp: 1, summary: 's' }];
    (invoke as any).mockResolvedValue(articles);
    const first = await useStocks.getState().fetchNews('msft');
    expect(first).toEqual(articles);
    expect(invoke).toHaveBeenCalledWith('fetch_stock_news', { symbol: 'MSFT' });
    (invoke as any).mockClear();
    const second = await useStocks.getState().fetchNews('msft');
    expect(second).toEqual(articles);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('stores an error when news fetch fails', async () => {
    (invoke as any).mockRejectedValue(new Error('news boom'));
    const articles = await useStocks.getState().fetchNews('msft');
    expect(articles).toEqual([]);
    const entry = useStocks.getState().news['MSFT'];
    expect(entry).toBeDefined();
    expect(entry.articles).toEqual([]);
    expect(entry.error).toBe('news boom');
  });

  it('adds and removes symbols', () => {
    const origStart = useStocks.getState().startPolling;
    const origStop = useStocks.getState().stopPolling;
    useStocks.setState({ startPolling: vi.fn(), stopPolling: vi.fn() } as any);
    const store = useStocks.getState();
    store.addStock('msft');
    expect(useStocks.getState().symbols).toContain('MSFT');
    expect((store.startPolling as any)).toHaveBeenCalledWith('MSFT');
    store.removeStock('msft');
    expect(useStocks.getState().symbols).not.toContain('MSFT');
    expect((store.stopPolling as any)).toHaveBeenCalledWith('MSFT');
    useStocks.setState({ startPolling: origStart, stopPolling: origStop } as any);
  });
});
