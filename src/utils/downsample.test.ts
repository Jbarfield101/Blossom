import { describe, it, expect } from 'vitest';
import { bucketDownsample } from './downsample';

describe('bucketDownsample', () => {
  it('averages buckets by pixel width', () => {
    const data = Array.from({ length: 100 }, (_, i) => i);
    const result = bucketDownsample(data, 10);
    expect(result.length).toBe(10);
    expect(result[0]).toBeCloseTo(4.5, 1);
    expect(result[result.length - 1]).toBeCloseTo(94.5, 1);
  });
});
