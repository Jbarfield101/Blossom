import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTasks } from './tasks';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));

describe('useTasks error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTasks.setState({ tasks: {}, pollers: {} });
  });

  afterEach(() => {
    const { pollers, stopPolling } = useTasks.getState();
    Object.keys(pollers).forEach((id) => stopPolling(Number(id)));
    vi.useRealTimers();
  });

  it('marks task failed and stops polling when fetchStatus fails', async () => {
    vi.useFakeTimers();
    (invoke as any).mockRejectedValue(new Error('boom'));
    useTasks.setState({
      tasks: { 1: { id: 1, label: 't', status: 'running', progress: 0, started_at: 0 } },
    } as any);
    useTasks.getState().startPolling(1, 1000);
    await expect(useTasks.getState().fetchStatus(1)).rejects.toThrow('boom');
    const state = useTasks.getState();
    expect(state.pollers[1]).toBeUndefined();
    expect(state.tasks[1]).toMatchObject({ status: 'failed', error: 'boom' });
  });

  it('marks task failed and stops polling when cancelTask fails', async () => {
    vi.useFakeTimers();
    (invoke as any).mockRejectedValue(new Error('nope'));
    useTasks.setState({
      tasks: { 1: { id: 1, label: 't', status: 'running', progress: 0, started_at: 0 } },
    } as any);
    useTasks.getState().startPolling(1, 1000);
    await expect(useTasks.getState().cancelTask(1)).rejects.toThrow('nope');
    const state = useTasks.getState();
    expect(state.pollers[1]).toBeUndefined();
    expect(state.tasks[1]).toMatchObject({ status: 'failed', error: 'nope' });
  });
});
