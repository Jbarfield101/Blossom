import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import type { ShortSpec } from "./types";

interface ShortsState {
  shorts: ShortSpec[];
  selectedId: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  create: () => Promise<void>;
  select: (id: string | null) => void;
  update: (id: string, patch: Partial<ShortSpec>) => Promise<void>;
}

const useShortsStore = create<ShortsState>((set, get) => ({
  shorts: [],
  selectedId: null,
  loaded: false,
  async load() {
    if (get().loaded) return;
    try {
      const res = await invoke<ShortSpec[]>("load_shorts");
      set({ shorts: res, loaded: true });
    } catch {
      set({ shorts: [], loaded: true });
    }
  },
  async create() {
    const spec: ShortSpec = {
      id: crypto.randomUUID(),
      title: "Untitled",
      script: "",
      status: "draft",
      created_at: new Date().toISOString(),
    };
    set((state) => ({ shorts: [...state.shorts, spec], selectedId: spec.id }));
    await invoke("save_shorts", { specs: get().shorts });
  },
  select(id) {
    set({ selectedId: id });
  },
  async update(id, patch) {
    set((state) => ({
      shorts: state.shorts.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
    await invoke("save_shorts", { specs: get().shorts });
  },
}));

export function useShorts() {
  const store = useShortsStore();
  useEffect(() => {
    store.load();
  }, [store]);
  return store;
}

export type { ShortsState };
