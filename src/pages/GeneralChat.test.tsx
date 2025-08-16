import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GeneralChat, { SYSTEM_PROMPT } from './GeneralChat';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useUsers, defaultModules } from '../features/users/useUsers';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));

describe('GeneralChat', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    useUsers.setState({
      users: {
        test: {
          id: 'test',
          name: 'Test User',
          theme: 'default',
          modules: { ...defaultModules },
        },
      },
      currentUserId: 'test',
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    useUsers.setState({ users: {}, currentUserId: null });
  });

  it('handles message flow', async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'general_chat') return Promise.resolve('Reply');
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(<GeneralChat />);
    const systemPromptWithName =
      SYSTEM_PROMPT + " The user's name is Test User. Address them by name.";
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Hello' } });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);

    await waitFor(() => {
      const calls = (invoke as any).mock.calls.filter(([cmd]: [string]) => cmd === 'general_chat');
      expect(calls).toHaveLength(1);
      expect(calls[0][1]).toEqual({
        messages: [
          { role: 'system', content: systemPromptWithName },
          { role: 'user', content: 'Hello' },
        ],
      });
    });
    expect(screen.getAllByText('Hello')[0]).toBeInTheDocument();
    expect(await screen.findByText('Reply')).toBeInTheDocument();
  });

  it('inserts system prompt only once', async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'general_chat') return Promise.resolve('Reply');
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(<GeneralChat />);
    const systemPromptWithName =
      SYSTEM_PROMPT + " The user's name is Test User. Address them by name.";
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    // first message
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Hi' } });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);
    await waitFor(() => {
      const calls = (invoke as any).mock.calls.filter(([cmd]: [string]) => cmd === 'general_chat');
      expect(calls).toHaveLength(1);
      expect(calls[0][1]).toEqual({
        messages: [
          { role: 'system', content: systemPromptWithName },
          { role: 'user', content: 'Hi' },
        ],
      });
    });
    expect(await screen.findByText('Reply')).toBeInTheDocument();

    // second message
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'How are you?' } });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);
    await waitFor(() => {
      const calls = (invoke as any).mock.calls.filter(([cmd]: [string]) => cmd === 'general_chat');
      expect(calls).toHaveLength(2);
      expect(calls[1][1]).toEqual({
        messages: [
          { role: 'system', content: systemPromptWithName },
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Reply' },
          { role: 'user', content: 'How are you?' },
        ],
      });
    });
  });

  it('shows error when send fails', async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'general_chat') return Promise.reject('fail');
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(<GeneralChat />);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Hi' } });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);

    await waitFor(() => expect(screen.getByText('fail')).toBeInTheDocument());
  });
});

