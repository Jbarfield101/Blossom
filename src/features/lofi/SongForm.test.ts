import { describe, it, expect } from 'vitest';
import { chordFromDegree, voiceLeadChords } from './SongForm';
import * as Tone from 'tone';

describe('chordFromDegree', () => {
  it('builds a maj7 chord for the I degree', () => {
    const chord = chordFromDegree(1, 'C');
    expect(chord).toEqual(['C4', 'E4', 'G4', 'B4']);
  });
});

describe('voiceLeadChords', () => {
  it('minimizes root movement between chords', () => {
    const prog = [chordFromDegree(1, 'C'), chordFromDegree(5, 'C')];
    const voiced = voiceLeadChords(prog);
    const prevRoot = Tone.Frequency(voiced[0][0]).toMidi();
    const rawRoot = Tone.Frequency(prog[1][0]).toMidi();
    const voicedRoot = Tone.Frequency(voiced[1][0]).toMidi();
    expect(Math.abs(voicedRoot - prevRoot)).toBeLessThan(Math.abs(rawRoot - prevRoot));
  });
});
