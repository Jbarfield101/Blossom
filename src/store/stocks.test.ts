import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStocks } from './stocks';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('useStocks store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStocks.setState({ quotes: {}, pollers: {}, symbols: [] });
  });

  afterEach(() => {
    const { pollers, stopPolling } = useStocks.getState();
    Object.keys(pollers).forEach((s) => stopPolling(s));
    useStocks.setState({ symbols: [] });
    vi.useRealTimers();
  });

  it('fetches quotes through the backend', async () => {
    (invoke as any).mockResolvedValue({
      quotes: [{ price: 123, change_percent: 1, status: 'OPEN' }],
      series: [{ points: [{ close: 1 }, { close: 2 }, { close: 3 }] }],
      market: { phase: 'OPEN' },
      stale: false,
    });
    const price = await useStocks.getState().fetchQuote('AAPL');
    expect(price).toBe(123);
    expect(invoke).toHaveBeenCalledWith('stocks_fetch', { tickers: ['AAPL'], range: '1d' });
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
      quotes: [{ price: 100, change_percent: 0, status: 'CLOSED' }],
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
      quotes: [{ price: 100, change_percent: 0, status: 'CLOSED' }],
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

  it('requests a forecast from the backend', async () => {
    (invoke as any).mockResolvedValue('Uptrend');
    const result = await useStocks.getState().forecast('goog');
    expect(result).toBe('Uptrend');
    expect(invoke).toHaveBeenCalledWith('stock_forecast', { symbol: 'GOOG' });
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
