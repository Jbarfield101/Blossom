import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTasks, SongSpec } from './tasks';
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
      tasks: { 1: { id: 1, label: 't', status: 'running', progress: 0 } },
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
      tasks: { 1: { id: 1, label: 't', status: 'running', progress: 0 } },
    } as any);
    useTasks.getState().startPolling(1, 1000);
    await expect(useTasks.getState().cancelTask(1)).rejects.toThrow('nope');
    const state = useTasks.getState();
    expect(state.pollers[1]).toBeUndefined();
    expect(state.tasks[1]).toMatchObject({ status: 'failed', error: 'nope' });
  });
});

describe('enqueueTask validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTasks.setState({ tasks: {}, pollers: {} });
  });

  afterEach(() => {
    const { pollers, stopPolling } = useTasks.getState();
    Object.keys(pollers).forEach((id) => stopPolling(Number(id)));
  });

  it('builds command when label is a valid id and id is missing', async () => {
    (invoke as any).mockResolvedValue(1);
    const spec: SongSpec = {
      outDir: '/tmp/out',
      title: 't',
      bpm: 120,
    };
    const id = await useTasks.getState().enqueueTask('GenerateSong', { spec });
    expect(id).toBe(1);
    expect(invoke).toHaveBeenCalledWith('enqueue_task', {
      label: 'GenerateSong',
      command: { id: 'GenerateSong', spec },
    });
  });

  it('throws when command id is missing and label is not a task id', async () => {
    await expect(
      useTasks.getState().enqueueTask('NotATask', {} as any),
    ).rejects.toThrow(
      'Task command for NotATask is missing id: {}',
    );
  });

  it('throws when required fields are missing for GenerateSong', async () => {
    await expect(
      useTasks.getState().enqueueTask('GenerateSong', { spec: {} as any }),
    ).rejects.toThrow(/Missing required field\(s\)/);
  });

  it('throws when required fields are missing for GenerateBasicSfz', async () => {
    await expect(
      useTasks
        .getState()
        .enqueueTask('GenerateBasicSfz', { spec: {} as any }),
    ).rejects.toThrow(/Missing required field\(s\)/);
  });
});
