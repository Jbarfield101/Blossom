import { create } from 'zustand';

export type Job = {
  id: string;
  title: string;
  spec: any;
  status: string;
  outPath?: string;
  error?: string;
  progress?: number;
};

interface SongJobsState {
  jobs: Job[];
  setJobs: (updater: Job[] | ((prev: Job[]) => Job[])) => void;
  updateJob: (id: string, update: Partial<Job>) => void;
}

export const useSongJobs = create<SongJobsState>((set) => ({
  jobs: [],
  setJobs: (updater) =>
    set((state) => ({
      jobs:
        typeof updater === 'function'
          ? (updater as (prev: Job[]) => Job[])(state.jobs)
          : updater,
    })),
  updateJob: (id, update) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...update } : j)),
    })),
}));

export type { SongJobsState };
