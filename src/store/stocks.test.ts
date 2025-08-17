import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStocks } from './stocks';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('useStocks store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStocks.setState({ quotes: {}, pollers: {} });
  });

  afterEach(() => {
    const { pollers, stopPolling } = useStocks.getState();
    Object.keys(pollers).forEach((s) => stopPolling(s));
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
});
