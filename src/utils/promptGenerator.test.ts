import { describe, expect, it } from 'vitest';
import { generatePrompt } from './promptGenerator';

describe('generatePrompt', () => {
  it('creates a video prompt', () => {
    expect(generatePrompt('cats', 'video')).toBe('Generate a short video about cats.');
  });

  it('creates an image prompt', () => {
    expect(generatePrompt('dogs', 'image')).toBe('Generate a detailed image of dogs.');
  });

  it('creates a music prompt', () => {
    expect(generatePrompt('jazz', 'music')).toBe(
      'Compose a short piece of music about jazz.'
    );
  });

  it('creates a DND prompt', () => {
    expect(generatePrompt('dragons', 'dnd')).toBe(
      'Create a DND campaign idea involving dragons.'
    );
  });

  it('returns empty string for empty input', () => {
    expect(generatePrompt('   ', 'video')).toBe('');
  });
});
