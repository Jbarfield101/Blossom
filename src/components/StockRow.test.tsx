import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import StockRow from './StockRow';
import { useStocks } from '../store/stocks';

const baseQuote = {
  price: 123,
  changePercent: 1,
  history: [1, 2, 3],
  marketStatus: 'OPEN',
  lastFetched: Date.now(),
};

describe('StockRow', () => {
  beforeEach(() => {
    useStocks.setState({
      quotes: {},
      removeStock: vi.fn(),
      forecast: vi.fn().mockResolvedValue({ shortTerm: 'st', longTerm: 'lt' }),
      fetchNews: vi.fn().mockResolvedValue([]),
    } as any);
  });

  afterEach(() => {
    useStocks.setState({ quotes: {}, forecast: undefined, fetchNews: undefined } as any);
    cleanup();
  });

  it('renders quote data', async () => {
    useStocks.setState({ quotes: { AAPL: baseQuote } });
    const { asFragment } = render(<StockRow symbol="AAPL" />);
    await Promise.resolve();
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders error message when present', () => {
    useStocks.setState({ quotes: { AAPL: { ...baseQuote, error: 'fail' } } });
    const { getByText } = render(<StockRow symbol="AAPL" />);
    expect(getByText('fail')).toBeInTheDocument();
  });
});
