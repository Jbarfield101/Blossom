import { describe, it, expect } from 'vitest';
import { chordFromDegree, voiceLeadChords } from './useLofiEngine';
import * as Tone from 'tone';

describe('chordFromDegree', () => {
  it('adds a 9th extension for richer harmony', () => {
    const chord = chordFromDegree(1, 'C');
    expect(chord.length).toBe(5);
    expect(chord[4]).toBe('D5');
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
