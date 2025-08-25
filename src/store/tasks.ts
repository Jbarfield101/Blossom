import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export type TaskStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface Task {
  id: number;
  label: string;
  status: TaskStatus;
  progress: number;
  result?: unknown;
  error?: string;
  errorCode?: string;
}

interface RawTask {
  id: number;
  label: string;
  status: string | { Failed: { code: string; message: string } };
  progress: number;
  result?: unknown;
}

function normalize(raw: RawTask): Task {
  if (typeof raw.status === 'string') {
    return {
      id: raw.id,
      label: raw.label,
      status: raw.status.toLowerCase() as TaskStatus,
      progress: raw.progress,
      result: raw.result,
    };
  }
  return {
    id: raw.id,
    label: raw.label,
    status: 'failed',
    progress: raw.progress,
    result: raw.result,
    error: raw.status.Failed.message,
    errorCode: raw.status.Failed.code,
  };
}

interface TasksState {
  tasks: Record<number, Task>;
  pollers: Record<number, ReturnType<typeof setInterval>>;
  enqueueTask: (label: string, command: unknown) => Promise<number>;
  fetchStatus: (id: number) => Promise<void>;
  startPolling: (id: number, interval?: number) => void;
  stopPolling: (id: number) => void;
  cancelTask: (id: number) => Promise<boolean>;
  subscribe: () => Promise<UnlistenFn>;
}

export const useTasks = create<TasksState>((set, get) => ({
  tasks: {},
  pollers: {},
  enqueueTask: async (label, command) => {
    try {
      const id = await invoke<number>('enqueue_task', { label, command });
      set((state) => ({
        tasks: {
          ...state.tasks,
          [id]: { id, label, status: 'queued', progress: 0 },
        },
      }));
      get().startPolling(id);
      return id;
    } catch (error) {
      throw error;
    }
  },
  fetchStatus: async (id) => {
    try {
      const raw = await invoke<RawTask | null>('task_status', { id });
      if (raw) {
        const task = normalize(raw);
        set((state) => ({ tasks: { ...state.tasks, [id]: task } }));
        if (['completed', 'cancelled', 'failed'].includes(task.status)) {
          get().stopPolling(id);
        }
      }
    } catch (error: any) {
      get().stopPolling(id);
      set((state) => ({
        tasks: {
          ...state.tasks,
          [id]: {
            ...(state.tasks[id] ?? { id, label: '', progress: 0 }),
            status: 'failed',
            error: String(error?.message ?? error),
          },
        },
      }));
      throw error;
    }
  },
  startPolling: (id, interval = 1000) => {
    const { pollers } = get();
    if (pollers[id]) return;
    const handle = setInterval(() => get().fetchStatus(id), interval);
    set((state) => ({ pollers: { ...state.pollers, [id]: handle } }));
  },
  stopPolling: (id) => {
    const { pollers } = get();
    const handle = pollers[id];
    if (handle) clearInterval(handle);
    set((state) => {
      const { [id]: _, ...rest } = state.pollers;
      return { pollers: rest };
    });
  },
  cancelTask: async (id) => {
    try {
      const ok = await invoke<boolean>('cancel_task', { id });
      if (ok) {
        get().stopPolling(id);
        set((state) => ({
          tasks: {
            ...state.tasks,
            [id]: {
              ...(state.tasks[id] ?? { id, label: '', progress: 0 }),
              status: 'cancelled',
            },
          },
        }));
      }
      return ok;
    } catch (error: any) {
      get().stopPolling(id);
      set((state) => ({
        tasks: {
          ...state.tasks,
          [id]: {
            ...(state.tasks[id] ?? { id, label: '', progress: 0 }),
            status: 'failed',
            error: String(error?.message ?? error),
          },
        },
      }));
      throw error;
    }
  },
  subscribe: async () => {
    try {
      const unlisten = await listen<RawTask>('task_updated', (e) => {
        const task = normalize(e.payload);
        set((state) => ({ tasks: { ...state.tasks, [task.id]: task } }));
        if (['completed', 'cancelled', 'failed'].includes(task.status)) {
          get().stopPolling(task.id);
        }
      });
      return unlisten;
    } catch (error) {
      throw error;
    }
  },
}));

export type { TasksState };
