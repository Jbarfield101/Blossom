import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ImagePromptGenerator from './ImagePromptGenerator';

describe('ImagePromptGenerator', () => {
  it('selects camera and lens using radio buttons and generates prompt', () => {
    const onGenerate = vi.fn();
    render(<ImagePromptGenerator onGenerate={onGenerate} />);
    fireEvent.click(screen.getByRole('button', { name: /image prompt/i }));

    const textInput = screen.getByPlaceholderText(/describe the image/i);
    fireEvent.change(textInput, { target: { value: 'sunset' } });

    const kodak = screen.getByLabelText(/Kodak Portra 400/i);
    fireEvent.click(kodak);
    expect(kodak).toBeChecked();

    const polaroid = screen.getByLabelText(/Shot on Polaroid/i);
    expect(polaroid).not.toBeDisabled();
    fireEvent.click(polaroid);
    expect(polaroid).toBeChecked();
    expect(kodak).not.toBeChecked();

    const wide = screen.getByLabelText(/Wide-angle lens, 24mm/i);
    fireEvent.click(wide);
    expect(wide).toBeChecked();

    const macro = screen.getByLabelText(/Macro lens photography/i);
    fireEvent.click(macro);
    expect(macro).toBeChecked();
    expect(wide).not.toBeChecked();

    const ghibli = screen.getByLabelText(/Studio Ghibli/i);
    fireEvent.click(ghibli);

    const deakins = screen.getByLabelText(/cinematography by Roger Deakins/i);
    fireEvent.click(deakins);

    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    expect(onGenerate).toHaveBeenCalledWith(
      'sunset Shot on Polaroid (vintage, instant photo look) Macro lens photography cinematography by Roger Deakins Studio Ghibli–inspired framing'
    );
  });
});
