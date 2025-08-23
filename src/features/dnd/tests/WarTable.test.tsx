import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WarTable from '../WarTable';
import { useWarTableStore } from '../../../store/warTable';

describe('WarTable area notes', () => {
  beforeEach(() => {
    useWarTableStore.setState({
      mapImage: null,
      partyPosition: null,
      markers: [],
    });
    localStorage.clear();
  });

  it('adds and displays area notes through modals', async () => {
    render(<WarTable />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add area/i }));

    const map = screen.getByTestId('map');
    Object.defineProperty(map, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }),
    });

    await user.click(map, { clientX: 10, clientY: 10 });

    const input = await screen.findByRole('textbox', { name: /area note/i });
    await user.type(input, 'Test Note');
    await user.click(screen.getByRole('button', { name: /save/i }));

    const marker = await screen.findByTitle('Test Note');

    await user.click(marker);
    await screen.findByText('Test Note');
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByText('Test Note')).toBeNull();
  });
});

