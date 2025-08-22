import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fusion from './Fusion';

function getArchive() {
  return JSON.parse(localStorage.getItem('fusionArchive') || '[]');
}

describe('Fusion', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('fuses provided words into prompt and stores archive', () => {
    render(<Fusion />);
    fireEvent.change(screen.getByLabelText('Word 1'), { target: { value: 'cat' } });
    fireEvent.change(screen.getByLabelText('Word 2'), { target: { value: 'robot' } });
    fireEvent.click(screen.getByRole('button', { name: /^Fuse$/i }));
    const expected = 'Generate a detailed image of cat robot.';
    expect(screen.getByLabelText('Image Prompt')).toHaveValue(expected);
    const archive = getArchive();
    expect(archive[0]).toEqual({ word1: 'cat', word2: 'robot', prompt: expected });
  });

  it('random button fills words and archives', () => {
    render(<Fusion />);
    fireEvent.click(screen.getAllByRole('button', { name: /random/i })[2]);
    expect(screen.getByLabelText('Word 1')).not.toHaveValue('');
    expect(screen.getByLabelText('Word 2')).not.toHaveValue('');
    expect(screen.getByLabelText('Image Prompt')).not.toHaveValue('');
    const archive = getArchive();
    expect(archive.length).toBe(1);
  });

  it('keeps only 200 most recent prompts', () => {
    const entries = Array.from({ length: 200 }, (_, i) => ({
      word1: `w${i}`,
      word2: `x${i}`,
      prompt: `p${i}`,
    }));
    localStorage.setItem('fusionArchive', JSON.stringify(entries));
    render(<Fusion />);
    fireEvent.change(screen.getByLabelText('Word 1'), { target: { value: 'new' } });
    fireEvent.change(screen.getByLabelText('Word 2'), { target: { value: 'entry' } });
    fireEvent.click(screen.getByRole('button', { name: /^Fuse$/i }));
    const archive = getArchive();
    expect(archive.length).toBe(200);
    expect(archive[0].word1).toBe('new');
    expect(archive[199].word1).toBe('w198');
  });
});
