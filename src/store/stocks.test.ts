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

  it('caches quotes for 60 seconds', async () => {
    (invoke as any).mockResolvedValue(123);
    const price1 = await useStocks.getState().fetchQuote('AAPL');
    const price2 = await useStocks.getState().fetchQuote('AAPL');
    expect(price1).toBe(123);
    expect(price2).toBe(123);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('polls for updates when started', async () => {
    vi.useFakeTimers();
    (invoke as any).mockResolvedValue(100);
    const store = useStocks.getState();
    store.startPolling('MSFT', 1000);
    await vi.advanceTimersByTimeAsync(3100);
    store.stopPolling('MSFT');
    expect(invoke).toHaveBeenCalledTimes(4);
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
