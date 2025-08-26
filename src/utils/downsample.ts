export function bucketDownsample(data: number[], pixelWidth: number): number[] {
  if (!data || data.length === 0 || pixelWidth <= 0) return [];
  const bucketSize = Math.max(1, Math.floor(data.length / pixelWidth));
  const out: number[] = [];
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    count++;
    if (count === bucketSize) {
      out.push(sum / count);
      sum = 0;
      count = 0;
    }
  }
  if (count > 0) {
    out.push(sum / count);
  }
  return out;
}
