import { describe, expect, it } from 'vitest';
import { generatePrompt } from './promptGenerator';

describe('generatePrompt', () => {
  it('creates a video prompt', () => {
    expect(generatePrompt('cats', 'video')).toBe('Generate a short video about cats.');
  });

  it('creates an image prompt', () => {
    expect(generatePrompt('dogs', 'image')).toBe('Generate a detailed image of dogs.');
  });

  it('returns empty string for empty input', () => {
    expect(generatePrompt('   ', 'video')).toBe('');
  });
});
