import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }));
import RuleForm from '../RuleForm';

describe('RuleForm custom rules', () => {
  it('copies existing rule and previews custom', async () => {
    render(<RuleForm />);
    const user = userEvent.setup();

    await user.click(screen.getByLabelText(/Base Rule/i));
    await user.click(await screen.findByRole('option', { name: 'Ability Checks' }));
    const nameInput = screen.getByLabelText(/Name/i);
    expect(nameInput).toHaveValue('Ability Checks');

    await user.clear(nameInput);
    await user.type(nameInput, 'Ability Checks Custom');
    const tagsInput = screen.getByLabelText(/Tags/i);
    await user.clear(tagsInput);
    await user.type(tagsInput, 'custom');
    const descInput = screen.getByLabelText(/Description/i);
    await user.clear(descInput);
    await user.type(descInput, 'desc');

    await user.click(screen.getByRole('button', { name: /submit/i }));
    const preview = await screen.findByTestId('rule-preview');
    expect(preview).toHaveTextContent('Based on');
    expect(preview).toHaveTextContent('Ability Checks Custom');
    expect(screen.getByText(/view rule book/i)).toBeInTheDocument();
  });
});
