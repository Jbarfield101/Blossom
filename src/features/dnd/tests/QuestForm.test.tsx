import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import QuestForm from '../QuestForm';

describe('QuestForm validation', () => {
  it('shows errors for invalid tier and GP', async () => {
    render(<QuestForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Name/i), 'Quest');
    await user.type(screen.getByLabelText(/Tier/i), '-1');
    await user.type(screen.getByLabelText(/Summary/i), 'Summary');
    await user.type(screen.getByLabelText(/Beats/i), 'beat');
    await user.type(screen.getByLabelText(/Reward GP/i), '-5');
    await user.type(screen.getByLabelText(/Complications/i), 'comp');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    const errors = await screen.findAllByText('Number must be greater than 0');
    expect(errors).toHaveLength(2);
  });
});
