import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'canceled';

export interface MusicJob {
  id: string;
  title: string;
  prompt: string;
  createdAt: number;
  status: JobStatus;
  progress?: number; // 0-100
  wavPath?: string; // final output from python
  wavPathFinal?: string; // post-processed final output
  draftUrl?: string; // local preview (e.g., uploaded melody)
  error?: string;
}

interface MusicJobsState {
  jobs: Record<string, MusicJob>;
  add: (job: MusicJob) => void;
  update: (id: string, patch: Partial<MusicJob>) => void;
  remove: (id: string) => void;
  list: () => MusicJob[];
  get: (id: string) => MusicJob | undefined;
}

export const useMusicJobs = create<MusicJobsState>()(
  persist(
    (set, get) => ({
      jobs: {},
      add: (job) => set((s) => ({ jobs: { ...s.jobs, [job.id]: job } })),
      update: (id, patch) => set((s) => ({ jobs: { ...s.jobs, [id]: { ...s.jobs[id], ...patch } } })),
      remove: (id) => set((s) => { const { [id]: _, ...rest } = s.jobs; return { jobs: rest }; }),
      list: () => Object.values(get().jobs).sort((a,b) => b.createdAt - a.createdAt),
      get: (id) => get().jobs[id],
    }),
    { name: 'music-jobs' }
  )
);
