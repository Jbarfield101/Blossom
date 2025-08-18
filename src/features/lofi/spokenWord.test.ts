import { describe, it, expect } from 'vitest';
import { scheduleSpokenWord, applyVinylEffect } from './spokenWord';

describe('spoken word helpers', () => {
  it('exposes a schedule function', () => {
    expect(typeof scheduleSpokenWord).toBe('function');
  });

  it('exposes an effect helper', () => {
    expect(typeof applyVinylEffect).toBe('function');
  });
});
