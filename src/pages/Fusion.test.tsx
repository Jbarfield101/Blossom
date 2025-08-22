import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fusion from './Fusion';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('Fusion', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('sends prompt to general_chat and shows reply', async () => {
    (invoke as any).mockResolvedValue('Prompt out');
    render(<Fusion />);
    fireEvent.change(screen.getByLabelText('Word 1'), { target: { value: 'cat' } });
    fireEvent.change(screen.getByLabelText('Word 2'), { target: { value: 'robot' } });
    fireEvent.click(screen.getByRole('button', { name: /send to chat/i }));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('general_chat', {
        messages: [
          { role: 'user', content: 'Generate a detailed image of cat robot.' },
        ],
      });
    });
    expect(screen.getByLabelText('Image Prompt')).toHaveValue('Prompt out');
  });
});

