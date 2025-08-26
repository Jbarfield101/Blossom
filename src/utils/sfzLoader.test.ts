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
});
