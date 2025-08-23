import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import ImagePromptGenerator from './ImagePromptGenerator';

describe('ImagePromptGenerator', () => {
  afterEach(cleanup);
  it('persists selections after generating and clears on reset', () => {
    const onGenerate = vi.fn();
    render(<ImagePromptGenerator onGenerate={onGenerate} />);
    fireEvent.click(screen.getByRole('button', { name: /image prompt/i }));

    const textInput = screen.getByPlaceholderText(/describe the image/i);
    fireEvent.change(textInput, { target: { value: 'sunset' } });

    const polaroid = screen.getByLabelText(/Shot on Polaroid/i);
    fireEvent.click(polaroid);

    const macro = screen.getByLabelText(/Macro lens photography/i);
    fireEvent.click(macro);

    const ghibli = screen.getByLabelText(/Studio Ghibli/i);
    fireEvent.click(ghibli);

    const deakins = screen.getByLabelText(/cinematography by Roger Deakins/i);
    fireEvent.click(deakins);

    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    expect(onGenerate).toHaveBeenCalledWith(
      'sunset Shot on Polaroid (vintage, instant photo look) Macro lens photography cinematography by Roger Deakins Studio Ghibli–inspired framing'
    );

    // State should persist after generating
    expect(textInput).toHaveValue('sunset');
    expect(polaroid).toBeChecked();
    expect(macro).toBeChecked();
    expect(ghibli).toBeChecked();

    // Reset clears all selections
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(textInput).toHaveValue('');
    expect(polaroid).not.toBeChecked();
    expect(macro).not.toBeChecked();
    expect(ghibli).not.toBeChecked();
  });

  it('updates preview as selections change', () => {
    render(<ImagePromptGenerator onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /image prompt/i }));

    const textInput = screen.getByPlaceholderText(/describe the image/i);
    fireEvent.change(textInput, { target: { value: 'mountain' } });
    const preview = screen.getByLabelText(/preview/i);
    expect(preview).toHaveValue('mountain');

    fireEvent.click(screen.getByLabelText(/Shot on Polaroid/i));
    expect(preview).toHaveValue(
      'mountain Shot on Polaroid (vintage, instant photo look)'
    );

    fireEvent.click(screen.getByLabelText(/Macro lens photography/i));
    expect(preview).toHaveValue(
      'mountain Shot on Polaroid (vintage, instant photo look) Macro lens photography'
    );
  });
});
