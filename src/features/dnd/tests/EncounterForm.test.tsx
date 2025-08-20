import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import EncounterForm from '../EncounterForm';

describe('EncounterForm validation', () => {
  it('shows error for invalid level', async () => {
    render(<EncounterForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Name/i), 'Encounter');
    await user.type(screen.getByLabelText(/Level/i), '-1');
    await user.type(screen.getByLabelText(/Creatures/i), 'goblin');
    await user.type(screen.getByLabelText(/Tactics/i), 'attack');
    await user.type(screen.getByLabelText(/Terrain/i), 'forest');
    await user.type(screen.getByLabelText(/Treasure/i), 'gold');
    await user.type(screen.getByLabelText(/Scaling/i), 'hard');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(await screen.findByText('Number must be greater than 0')).toBeInTheDocument();
  });
});
