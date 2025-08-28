import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('tone', () => ({
  Frequency: (midi: number) => ({ toNote: () => `midi-${midi}` }),
  Sampler: class {
    constructor() {}
  },
  loaded: () => Promise.resolve(),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { parseSfz } from './sfzLoader';

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true });
});

describe('parseSfz', () => {
  it('parses regions and opcodes', async () => {
    const sfz = `
<region>
sample=kick.wav
lokey=36
hikey=36
pitch_keycenter=36
`;
    const regions = await parseSfz(sfz);
    expect(regions).toHaveLength(1);
    expect(regions[0].sample).toBe('kick.wav');
    expect(regions[0].lokey).toBe(36);
    expect(regions[0].hikey).toBe(36);
    expect(regions[0].pitch_keycenter).toBe(36);
  });

  it('resolves sample paths relative to basePath', async () => {
    const sfz = `\n<region>\nsample=snare.wav`;
    const regions = await parseSfz(sfz, '/audio/');
    expect(regions).toHaveLength(1);
    expect(regions[0].sample).toBe('/audio/snare.wav');
  });

  it('ignores unsupported sections and unknown opcodes', async () => {
    const sfz = `\n<group>\nfoo=bar\n<region>\nsample=hat.wav\nunknown=42`;
    const regions = await parseSfz(sfz);
    expect(regions).toHaveLength(1);
    expect(regions[0].sample).toBe('hat.wav');
    expect((regions[0] as any).unknown).toBe(42);
  });

  it('preserves order of multiple regions', async () => {
    const sfz = `\n<region>\nsample=one.wav\n<region>\nsample=two.wav`;
    const regions = await parseSfz(sfz);
    expect(regions.map((r) => r.sample)).toEqual(['one.wav', 'two.wav']);
  });

  it('throws if a sample is missing', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    const sfz = `\n<region>\nsample=missing.wav`;
    await expect(parseSfz(sfz)).rejects.toThrow(
      'Missing samples: missing.wav',
    );
  });
});
