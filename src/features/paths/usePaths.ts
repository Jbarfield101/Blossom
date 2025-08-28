import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

interface PathsState {
  pythonPath: string;
  defaultPythonPath: string;
  comfyPath: string;
  loaded: boolean;
  error: string | null;
  clearError: () => void;
  setPythonPath: (p: string) => void;
  setComfyPath: (p: string) => void;
  load: () => Promise<void>;
}

export const usePathsStore = create<PathsState>((set, get) => ({
  pythonPath: "",
  defaultPythonPath: "",
  comfyPath: "",
  loaded: false,
  error: null,
  clearError: () => set({ error: null }),
  setPythonPath: (pythonPath: string) => {
    set({ pythonPath });
    invoke("save_paths", {
      python_path: pythonPath,
      comfy_path: get().comfyPath,
    }).catch((err) => {
      console.error("Failed to save paths:", err);
      set({ error: `Failed to save paths: ${String(err)}` });
    });
  },
  setComfyPath: (comfyPath: string) => {
    set({ comfyPath });
    invoke("save_paths", {
      python_path: get().pythonPath,
      comfy_path: comfyPath,
    }).catch((err) => {
      console.error("Failed to save paths:", err);
      set({ error: `Failed to save paths: ${String(err)}` });
    });
  },
  load: async () => {
    if (get().loaded) return;
    try {
      const res = await invoke<{
        python_path?: string;
        comfy_path?: string;
      }>("load_paths");
      const detected = await invoke<string>("detect_python");
      set({
        pythonPath: res.python_path || "",
        defaultPythonPath: detected,
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
