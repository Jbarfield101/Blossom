import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import StockRow from './StockRow';
import { useStocks } from '../store/stocks';

const baseQuote = {
  price: 123,
  changePercent: 1,
  history: [1, 2, 3],
  marketStatus: 'OPEN',
  volume: 1000,
  lastFetched: Date.now(),
};

describe('StockRow', () => {
  beforeEach(() => {
    useStocks.setState({
      quotes: {},
      ws: {},
      removeStock: vi.fn(),
      forecast: vi.fn().mockResolvedValue({ shortTerm: 'st', longTerm: 'lt' }),
      fetchNews: vi.fn().mockResolvedValue([]),
    } as any);
  });

  afterEach(() => {
    useStocks.setState({ quotes: {}, ws: {}, forecast: undefined, fetchNews: undefined } as any);
    cleanup();
  });

  it('renders quote data', async () => {
    useStocks.setState({ quotes: { AAPL: baseQuote } });
    const { asFragment } = render(
      <StockRow
        symbol="AAPL"
        metrics={{ price: true, change: true, volume: true, trend: true }}
      />
    );
    await Promise.resolve();
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders error message when present', () => {
    useStocks.setState({ quotes: { AAPL: { ...baseQuote, error: 'fail' } } });
    const { getByText } = render(
      <StockRow
        symbol="AAPL"
        metrics={{ price: true, change: true, volume: true, trend: true }}
      />
    );
    expect(getByText('fail')).toBeInTheDocument();
  });
});
