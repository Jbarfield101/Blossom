import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { getRandomWord } from './randomWord';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = resolve(__dirname, './randomWord.ts');
const fileContent = readFileSync(filePath, 'utf8');
const match = fileContent.match(/const WORDS = \[([\s\S]*?)\];/);
if (!match) {
  throw new Error('WORDS array not found');
}
const WORDS: string[] = JSON.parse(`[${match[1]}]`);

describe('getRandomWord', () => {
  it('returns a word from the WORDS array', () => {
    const word = getRandomWord();
    expect(WORDS).toContain(word);
  });

  it('returns varied words across multiple calls', () => {
    const iterations = 20;
    const results = new Set(Array.from({ length: iterations }, () => getRandomWord()));
    expect(results.size).toBeGreaterThan(1);
  });
});

