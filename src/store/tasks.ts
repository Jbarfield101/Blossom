import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

interface SongSection {
  name: string;
  bars: number;
  chords?: string[];
}

export interface SongSpec {
  outDir: string;
  title: string;
  album?: string;
  bpm: number;
  // Optional metadata fields
  key?: string;
  form?: string;
  structure?: SongSection[];
  mood?: string[];
  instruments?: string[];
  leadInstrument?: string;
  ambience?: string[];
  ambienceLevel?: number;
  seed?: number;
  variety?: number;
  chordSpanBeats?: number;
  drumPattern?: string;
  hqStereo?: boolean;
  hqReverb?: boolean;
  hqSidechain?: boolean;
  hqChorus?: boolean;
  limiterDrive?: number;
  lofiFilter?: boolean;
  sfzInstrument?: string;
  midiFile?: string;
}

export type TaskCommand =
  | { id: 'Example' }
  | {
      id: 'LofiGenerateGpu';
      py: string;
      script: string;
      prompt: string;
      duration: number;
      seed: number;
    }
  | { id: 'PdfIngest'; py: string; script: string; doc_id: string }
  | { id: 'ParseNpcPdf'; py?: string; script?: string; path: string; world: string }
  | { id: 'ParseSpellPdf'; py?: string; script?: string; path: string }
  | { id: 'ParseRulePdf'; py?: string; script?: string; path: string }
  | { id: 'ParseLorePdf'; py?: string; script?: string; path: string; world: string }
  | { id: 'GenerateSong'; spec: SongSpec }
  | { id: 'GenerateBasicSfz'; spec: SongSpec }
  | { id: 'GenerateAlbum'; meta: any }
  | { id: 'GenerateShort'; spec: any };

const TASK_IDS: TaskCommand['id'][] = [
  'Example',
  'LofiGenerateGpu',
  'PdfIngest',
  'ParseNpcPdf',
  'ParseSpellPdf',
  'ParseRulePdf',
  'ParseLorePdf',
  'GenerateSong',
  'GenerateBasicSfz',
  'GenerateAlbum',
  'GenerateShort',
];

export function buildTaskCommand(
  id: TaskCommand['id'],
  fields: Record<string, unknown> = {}
): TaskCommand {
  return { id, ...fields } as TaskCommand;
}

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
  started_at?: string;
}

interface RawTask {
  id: number;
  label: string;
  status: string | { Failed: { code: string; message: string } };
  progress: number;
  result?: unknown;
  started_at?: string;
}

function normalize(raw: RawTask): Task {
  if (typeof raw.status === 'string') {
    return {
      id: raw.id,
      label: raw.label,
      status: raw.status.toLowerCase() as TaskStatus,
      progress: raw.progress,
      result: raw.result,
      started_at: raw.started_at,
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
    started_at: raw.started_at,
  };
}

interface TasksState {
  tasks: Record<number, Task>;
  pollers: Record<number, ReturnType<typeof setInterval>>;
  enqueueTask: (label: string, command: TaskCommand) => Promise<number>;
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
      let cmd: TaskCommand;
      if ((command as any)?.id) {
        cmd = command as TaskCommand;
      } else if (TASK_IDS.includes(label as TaskCommand['id'])) {
        cmd = buildTaskCommand(label as TaskCommand['id'], command as Record<string, unknown>);
      } else {
        throw new Error(`Task command for ${label} is missing id: ${JSON.stringify(command)}`);
      }
      if (cmd.id === 'GenerateSong' || cmd.id === 'GenerateBasicSfz') {
        const spec = (cmd as Extract<
          TaskCommand,
          { id: 'GenerateSong' | 'GenerateBasicSfz' }
        >).spec;
        const required: (keyof SongSpec)[] = ['outDir', 'title', 'bpm'];
        if (cmd.id === 'GenerateBasicSfz') {
          required.push('sfzInstrument');
        }
        const missing = required.filter((field) => {
          const value = spec[field];
          return (
            value === undefined ||
            value === null ||
            (Array.isArray(value) && value.length === 0)
          );
        });
        if (missing.length) {
          throw new Error(`Missing required field(s): ${missing.join(', ')}`);
        }
      }
      const id = await invoke<number>('enqueue_task', { label, command: cmd });
      set((state) => ({
        tasks: {
          ...state.tasks,
          [id]: { id, label, status: 'queued', progress: 0, started_at: new Date().toISOString() },
        },
      }));
      get().startPolling(id);
      return id;
    } catch (error) {
      console.error(error);
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

export async function listSpells() {
  return invoke<any[]>('list_spells');
}

export async function saveSpell(spell: unknown, overwrite?: boolean) {
  return invoke<void>('save_spell', { spell, overwrite });
}

export async function listRules() {
  return invoke<any[]>('list_rules');
}

export async function saveRule(rule: unknown, overwrite?: boolean) {
  return invoke<void>('save_rule', { rule, overwrite });
}
