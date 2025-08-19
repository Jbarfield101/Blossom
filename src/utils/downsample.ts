export function bucketDownsample(data: number[], pixelWidth: number): number[] {
  if (!data || data.length === 0 || pixelWidth <= 0) return [];
  const bucketSize = Math.max(1, Math.floor(data.length / pixelWidth));
  const out: number[] = [];
  for (let i = 0; i < data.length; i += bucketSize) {
    const slice = data.slice(i, i + bucketSize);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    out.push(avg);
  }
  return out;
}
