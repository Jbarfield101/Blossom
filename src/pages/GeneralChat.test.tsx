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
          mode: 'dark',
          money: 5000,
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
      if (cmd === 'detect_intent') return Promise.resolve('chat');
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
      const calls = (invoke as any).mock.calls;
      const detect = calls.find(([cmd]: [string]) => cmd === 'detect_intent');
      expect(detect).toBeTruthy();
      expect(detect[1]).toEqual({ query: 'Hello' });
      const chatCall = calls.find(([cmd]: [string]) => cmd === 'general_chat');
      expect(chatCall[1]).toEqual({
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
      if (cmd === 'detect_intent') return Promise.resolve('chat');
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
      const calls = (invoke as any).mock.calls;
      const chatCall = calls.find(([cmd]: [string]) => cmd === 'general_chat');
      expect(chatCall[1]).toEqual({
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
      const calls = (invoke as any).mock.calls;
      const secondChatCall = calls.filter(([cmd]: [string]) => cmd === 'general_chat')[1];
      expect(secondChatCall[1]).toEqual({
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
      if (cmd === 'detect_intent') return Promise.resolve('chat');
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

  it('handles system info intent', async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'detect_intent') return Promise.resolve('sys');
      if (cmd === 'system_info')
        return Promise.resolve({ cpu_usage: 1, mem_usage: 2, gpu_usage: 3 });
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(<GeneralChat />);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: 'stats' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);

    expect(await screen.findByText(/CPU: 1%/)).toBeInTheDocument();
    const chatCalls = (invoke as any).mock.calls.filter(
      ([cmd]: [string]) => cmd === 'general_chat'
    );
    expect(chatCalls).toHaveLength(0);
  });

  it('handles music intent', async () => {
    (invoke as any).mockImplementation((cmd: string, args: any) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'detect_intent') return Promise.resolve('music');
      if (cmd === 'generate_album') return Promise.resolve();
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(<GeneralChat />);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: 'My Song template="Classic Lofi" tracks=2' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);

    await waitFor(() => {
      const genCall = (invoke as any).mock.calls.find(
        ([cmd]: [string]) => cmd === 'generate_album'
      );
      expect(genCall[1]).toEqual({
        meta: { track_count: 2, title_base: 'My Song', template: 'Classic Lofi' },
      });
    });
    expect(
      await screen.findByText(
        'Started music generation for "My Song" using "Classic Lofi" with 2 tracks.'
      )
    ).toBeInTheDocument();
  });

  it('classifies natural system stats request', async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'detect_intent') return Promise.resolve('sys');
      if (cmd === 'system_info')
        return Promise.resolve({ cpu_usage: 1, mem_usage: 2, gpu_usage: 3 });
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(<GeneralChat />);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: 'can you show system stats?' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);

    expect(await screen.findByText(/CPU: 1%/)).toBeInTheDocument();
    const chatCalls = (invoke as any).mock.calls.filter(
      ([cmd]: [string]) => cmd === 'general_chat'
    );
    expect(chatCalls).toHaveLength(0);
  });

  it('classifies natural music request', async () => {
    (invoke as any).mockImplementation((cmd: string, args: any) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'detect_intent') return Promise.resolve('music');
      if (cmd === 'generate_album') return Promise.resolve();
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(<GeneralChat />);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: 'generate a chill song with three tracks' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);

    await waitFor(() => {
      const detect = (invoke as any).mock.calls.find(
        ([cmd]: [string]) => cmd === 'detect_intent'
      );
      expect(detect[1]).toEqual({
        query: 'generate a chill song with three tracks',
      });
      const genCalls = (invoke as any).mock.calls.filter(
        ([cmd]: [string]) => cmd === 'generate_album'
      );
      expect(genCalls).toHaveLength(0);
    });
    expect(
      await screen.findByText(/Please specify template and track count/)
    ).toBeInTheDocument();
  });
});

