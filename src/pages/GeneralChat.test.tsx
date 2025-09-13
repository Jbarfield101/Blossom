import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GeneralChat, { SYSTEM_PROMPT } from './GeneralChat';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useUsers, defaultModules } from '../features/users/useUsers';
import { MemoryRouter } from 'react-router-dom';

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
      if (cmd === 'detect_intent') return Promise.resolve('notes');
      if (cmd === 'general_chat') return Promise.resolve('Reply');
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(
      <MemoryRouter>
        <GeneralChat />
      </MemoryRouter>
    );
    const systemPromptWithName =
      SYSTEM_PROMPT + " The user's name is Test User. Address them by name.";
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Hello' } });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);

    await waitFor(() => {
      const calls = (invoke as any).mock.calls;
      const detect = calls.find(([cmd]: [string]) => cmd === 'detect_intent');
      expect(detect).toBeTruthy();
      expect(detect[1]).toEqual({ query: 'Hello' });
      const chatCall = calls.find(([cmd]: [string]) => cmd === 'general_chat');
      expect(chatCall[1]).toEqual({
        messages: [
          { role: 'system', content: 'You are a helpful assistant for personal or miscellaneous notes.' },
          { role: 'system', content: systemPromptWithName },
          { role: 'user', content: 'Hello' },
        ],
      });
      const retrieveCall = calls.find(([cmd]: [string]) => cmd === 'retrieve_context');
      expect(retrieveCall).toBeFalsy();
    });
    expect(screen.getAllByText('Hello')[0]).toBeInTheDocument();
    expect(await screen.findByText('Reply')).toBeInTheDocument();
  });

  it('inserts system prompt only once', async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'detect_intent') return Promise.resolve('notes');
      if (cmd === 'general_chat') return Promise.resolve('Reply');
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(
      <MemoryRouter>
        <GeneralChat />
      </MemoryRouter>
    );
    const systemPromptWithName =
      SYSTEM_PROMPT + " The user's name is Test User. Address them by name.";
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    // first message
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Hi' } });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);
    await waitFor(() => {
      const calls = (invoke as any).mock.calls;
      const chatCall = calls.find(([cmd]: [string]) => cmd === 'general_chat');
      expect(chatCall[1]).toEqual({
        messages: [
          { role: 'system', content: 'You are a helpful assistant for personal or miscellaneous notes.' },
          { role: 'system', content: systemPromptWithName },
          { role: 'user', content: 'Hi' },
        ],
      });
    });
    expect(await screen.findByText('Reply')).toBeInTheDocument();

    // second message
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'How are you?' } });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);
    await waitFor(() => {
      const calls = (invoke as any).mock.calls;
      const secondChatCall = calls.filter(([cmd]: [string]) => cmd === 'general_chat')[1];
      expect(secondChatCall[1]).toEqual({
        messages: [
          { role: 'system', content: 'You are a helpful assistant for personal or miscellaneous notes.' },
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
      if (cmd === 'detect_intent') return Promise.resolve('notes');
      if (cmd === 'general_chat') return Promise.reject('fail');
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(
      <MemoryRouter>
        <GeneralChat />
      </MemoryRouter>
    );
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Hi' } });
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

    render(
      <MemoryRouter>
        <GeneralChat />
      </MemoryRouter>
    );
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'stats' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);

    expect(await screen.findByText(/CPU: 1%/)).toBeInTheDocument();
    const chatCalls = (invoke as any).mock.calls.filter(
      ([cmd]: [string]) => cmd === 'general_chat'
    );
    expect(chatCalls).toHaveLength(0);
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

    render(
      <MemoryRouter>
        <GeneralChat />
      </MemoryRouter>
    );
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'can you show system stats?' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);

    expect(await screen.findByText(/CPU: 1%/)).toBeInTheDocument();
    const chatCalls = (invoke as any).mock.calls.filter(
      ([cmd]: [string]) => cmd === 'general_chat'
    );
    expect(chatCalls).toHaveLength(0);
  });

  it('routes npc intent with retrieval', async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'detect_intent') return Promise.resolve('npc');
      if (cmd === 'retrieve_context') return Promise.resolve('NPC ctx');
      if (cmd === 'general_chat') return Promise.resolve('Hi');
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(
      <MemoryRouter>
        <GeneralChat />
      </MemoryRouter>
    );
    const systemPromptWithName =
      SYSTEM_PROMPT + " The user's name is Test User. Address them by name.";
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'Who is Bob?' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);

    await waitFor(() => {
      const calls = (invoke as any).mock.calls;
      const retrieve = calls.find(([cmd]: [string]) => cmd === 'retrieve_context');
      expect(retrieve[1]).toEqual({ query: 'Who is Bob?', intent: 'npc' });
      const chatCall = calls.find(([cmd]: [string]) => cmd === 'general_chat');
      expect(chatCall[1]).toEqual({
        messages: [
          { role: 'system', content: 'You are roleplaying a non-player character. Stay in character and use any provided context.' },
          { role: 'system', content: 'NPC ctx' },
          { role: 'system', content: systemPromptWithName },
          { role: 'user', content: 'Who is Bob?' },
        ],
      });
    });
  });

  it('routes lore intent with retrieval', async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'detect_intent') return Promise.resolve('lore');
      if (cmd === 'retrieve_context') return Promise.resolve('Lore ctx');
      if (cmd === 'general_chat') return Promise.resolve('Hi');
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(
      <MemoryRouter>
        <GeneralChat />
      </MemoryRouter>
    );
    const systemPromptWithName =
      SYSTEM_PROMPT + " The user's name is Test User. Address them by name.";
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'Tell me about the realm' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);

    await waitFor(() => {
      const calls = (invoke as any).mock.calls;
      const retrieve = calls.find(([cmd]: [string]) => cmd === 'retrieve_context');
      expect(retrieve[1]).toEqual({
        query: 'Tell me about the realm',
        intent: 'lore',
      });
      const chatCall = calls.find(([cmd]: [string]) => cmd === 'general_chat');
      expect(chatCall[1]).toEqual({
        messages: [
          { role: 'system', content: 'You are a lore expert. Use the provided context to answer questions about the world or setting.' },
          { role: 'system', content: 'Lore ctx' },
          { role: 'system', content: systemPromptWithName },
          { role: 'user', content: 'Tell me about the realm' },
        ],
      });
    });
  });

  it('routes rules intent without retrieval', async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === 'start_ollama') return Promise.resolve();
      if (cmd === 'detect_intent') return Promise.resolve('rules');
      if (cmd === 'general_chat') return Promise.resolve('Ok');
      return Promise.resolve();
    });
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));

    render(
      <MemoryRouter>
        <GeneralChat />
      </MemoryRouter>
    );
    const systemPromptWithName =
      SYSTEM_PROMPT + " The user's name is Test User. Address them by name.";
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('start_ollama'));

    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'How does combat work?' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /send/i })[0]);

    await waitFor(() => {
      const calls = (invoke as any).mock.calls;
      const retrieve = calls.find(([cmd]: [string]) => cmd === 'retrieve_context');
      expect(retrieve).toBeFalsy();
      const chatCall = calls.find(([cmd]: [string]) => cmd === 'general_chat');
      expect(chatCall[1]).toEqual({
        messages: [
          { role: 'system', content: 'You are a rules assistant. Provide answers based on official game mechanics.' },
          { role: 'system', content: systemPromptWithName },
          { role: 'user', content: 'How does combat work?' },
        ],
      });
    });
  });

});

