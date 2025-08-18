import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

interface PathsState {
  pythonPath: string;
  comfyPath: string;
  loaded: boolean;
  setPythonPath: (p: string) => void;
  setComfyPath: (p: string) => void;
  load: () => Promise<void>;
}

const usePathsStore = create<PathsState>((set, get) => ({
  pythonPath: "",
  comfyPath: "",
  loaded: false,
  setPythonPath: (pythonPath: string) => {
    set({ pythonPath });
    invoke("save_paths", { python_path: pythonPath, comfy_path: get().comfyPath }).catch(() => {});
  },
  setComfyPath: (comfyPath: string) => {
    set({ comfyPath });
    invoke("save_paths", { python_path: get().pythonPath, comfy_path: comfyPath }).catch(() => {});
  },
  load: async () => {
    if (get().loaded) return;
    try {
      const res = await invoke<{ python_path?: string; comfy_path?: string }>("load_paths");
      set({
        pythonPath: res.python_path || "",
        comfyPath: res.comfy_path || "",
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
}));

export function usePaths() {
  const store = usePathsStore();
  useEffect(() => {
    store.load();
  }, [store]);
  return store;
}

export type { PathsState };
