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

  it('fuses provided concepts into prompt and stores archive', () => {
    render(<Fusion />);
    fireEvent.change(screen.getByLabelText('Concept 1'), {
      target: { value: 'ancient library' },
    });
    fireEvent.change(screen.getByLabelText('Concept 2'), {
      target: { value: 'floating city' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Fuse$/i }));
    const expected =
      'Generate a detailed image combining ancient library and floating city.';
    expect(screen.getByLabelText('Image Prompt')).toHaveValue(expected);
    const archive = getArchive();
    expect(archive[0]).toEqual({
      concept1: 'ancient library',
      concept2: 'floating city',
      prompt: expected,
    });
  });

  it('random button fills words and archives', () => {
    render(<Fusion />);
    fireEvent.click(screen.getAllByRole('button', { name: /random/i })[2]);
    expect(screen.getByLabelText('Concept 1')).not.toHaveValue('');
    expect(screen.getByLabelText('Concept 2')).not.toHaveValue('');
    expect(screen.getByLabelText('Image Prompt')).not.toHaveValue('');
    const archive = getArchive();
    expect(archive.length).toBe(1);
  });

  it('keeps only 200 most recent prompts', () => {
    const entries = Array.from({ length: 200 }, (_, i) => ({
      concept1: `w${i}`,
      concept2: `x${i}`,
      prompt: `p${i}`,
    }));
    localStorage.setItem('fusionArchive', JSON.stringify(entries));
    render(<Fusion />);
    fireEvent.change(screen.getByLabelText('Concept 1'), {
      target: { value: 'new' },
    });
    fireEvent.change(screen.getByLabelText('Concept 2'), {
      target: { value: 'entry' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Fuse$/i }));
    const archive = getArchive();
    expect(archive.length).toBe(200);
    expect(archive[0].concept1).toBe('new');
    expect(archive[199].concept1).toBe('w198');
  });
});
