import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ImagePromptGenerator from './ImagePromptGenerator';

describe('ImagePromptGenerator', () => {
  it('disables conflicting options and generates prompt', () => {
    const onGenerate = vi.fn();
    render(<ImagePromptGenerator onGenerate={onGenerate} />);
    fireEvent.click(screen.getByRole('button', { name: /image prompt/i }));

    const textInput = screen.getByPlaceholderText(/describe the image/i);
    fireEvent.change(textInput, { target: { value: 'sunset' } });

    const kodak = screen.getByLabelText(/Kodak Portra 400/i);
    fireEvent.click(kodak);
    const polaroid = screen.getByLabelText(/Shot on Polaroid/i);
    expect(polaroid).toBeDisabled();

    const wide = screen.getByLabelText(/Wide-angle lens/i);
    fireEvent.click(wide);
    const tilt = screen.getByLabelText(/Tilt-shift lens effect/i);
    expect(tilt).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    expect(onGenerate).toHaveBeenCalledWith(
      'sunset Shot on Kodak Portra 400 (warm, soft film aesthetic) Wide-angle lens, 24mm'
    );
  });
});

