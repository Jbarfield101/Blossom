import { describe, expect, it, vi } from 'vitest';

vi.mock('tone', () => ({
  Frequency: (midi: number) => ({ toNote: () => `midi-${midi}` }),
  Sampler: class {
    constructor() {}
  },
  loaded: () => Promise.resolve(),
}));

import { parseSfz } from './sfzLoader';

describe('parseSfz', () => {
  it('parses regions and opcodes', () => {
    const sfz = `
<region>
sample=kick.wav
lokey=36
hikey=36
pitch_keycenter=36
`;
    const regions = parseSfz(sfz);
    expect(regions).toHaveLength(1);
    expect(regions[0].sample).toBe('kick.wav');
    expect(regions[0].lokey).toBe(36);
    expect(regions[0].hikey).toBe(36);
    expect(regions[0].pitch_keycenter).toBe(36);
  });

  it('resolves sample paths relative to basePath', () => {
    const sfz = `\n<region>\nsample=snare.wav`;
    const regions = parseSfz(sfz, '/audio/');
    expect(regions).toHaveLength(1);
    expect(regions[0].sample).toBe('/audio/snare.wav');
  });

  it('ignores unsupported sections and unknown opcodes', () => {
    const sfz = `\n<group>\nfoo=bar\n<region>\nsample=hat.wav\nunknown=42`;
    const regions = parseSfz(sfz);
    expect(regions).toHaveLength(1);
    expect(regions[0].sample).toBe('hat.wav');
    expect((regions[0] as any).unknown).toBe(42);
  });

  it('preserves order of multiple regions', () => {
    const sfz = `\n<region>\nsample=one.wav\n<region>\nsample=two.wav`;
    const regions = parseSfz(sfz);
    expect(regions.map((r) => r.sample)).toEqual(['one.wav', 'two.wav']);
  });
});
