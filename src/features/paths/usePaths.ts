import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

interface PathsState {
  pythonPath: string;
  defaultPythonPath: string;
  comfyPath: string;
  ttsModelPath: string;
  ttsConfigPath: string;
  ttsSpeaker: string;
  ttsLanguage: string;
  loaded: boolean;
  setPythonPath: (p: string) => void;
  setComfyPath: (p: string) => void;
  setTtsModelPath: (p: string) => void;
  setTtsConfigPath: (p: string) => void;
  setTtsSpeaker: (s: string) => void;
  setTtsLanguage: (l: string) => void;
  load: () => Promise<void>;
}

export const usePathsStore = create<PathsState>((set, get) => ({
  pythonPath: "",
  defaultPythonPath: "",
  comfyPath: "",
  ttsModelPath: "",
  ttsConfigPath: "",
  ttsSpeaker: "",
  ttsLanguage: "",
  loaded: false,
  setPythonPath: (pythonPath: string) => {
    set({ pythonPath });
    invoke("save_paths", {
      python_path: pythonPath,
      comfy_path: get().comfyPath,
      tts_model_path: get().ttsModelPath,
      tts_config_path: get().ttsConfigPath,
      tts_speaker: get().ttsSpeaker,
      tts_language: get().ttsLanguage,
    }).catch((err) => {
      console.error("Failed to save paths:", err);
    });
  },
  setComfyPath: (comfyPath: string) => {
    set({ comfyPath });
    invoke("save_paths", {
      python_path: get().pythonPath,
      comfy_path: comfyPath,
      tts_model_path: get().ttsModelPath,
      tts_config_path: get().ttsConfigPath,
      tts_speaker: get().ttsSpeaker,
      tts_language: get().ttsLanguage,
    }).catch((err) => {
      console.error("Failed to save paths:", err);
    });
  },
  setTtsModelPath: (ttsModelPath: string) => {
    set({ ttsModelPath });
    invoke("save_paths", {
      python_path: get().pythonPath,
      comfy_path: get().comfyPath,
      tts_model_path: ttsModelPath,
      tts_config_path: get().ttsConfigPath,
      tts_speaker: get().ttsSpeaker,
      tts_language: get().ttsLanguage,
    }).catch((err) => {
      console.error("Failed to save paths:", err);
    });
  },
  setTtsConfigPath: (ttsConfigPath: string) => {
    set({ ttsConfigPath });
    invoke("save_paths", {
      python_path: get().pythonPath,
      comfy_path: get().comfyPath,
      tts_model_path: get().ttsModelPath,
      tts_config_path: ttsConfigPath,
      tts_speaker: get().ttsSpeaker,
      tts_language: get().ttsLanguage,
    }).catch((err) => {
      console.error("Failed to save paths:", err);
    });
  },
  setTtsSpeaker: (ttsSpeaker: string) => {
    set({ ttsSpeaker });
    invoke("save_paths", {
      python_path: get().pythonPath,
      comfy_path: get().comfyPath,
      tts_model_path: get().ttsModelPath,
      tts_config_path: get().ttsConfigPath,
      tts_speaker: ttsSpeaker,
      tts_language: get().ttsLanguage,
    }).catch((err) => {
      console.error("Failed to save paths:", err);
    });
  },
  setTtsLanguage: (ttsLanguage: string) => {
    set({ ttsLanguage });
    invoke("save_paths", {
      python_path: get().pythonPath,
      comfy_path: get().comfyPath,
      tts_model_path: get().ttsModelPath,
      tts_config_path: get().ttsConfigPath,
      tts_speaker: get().ttsSpeaker,
      tts_language: ttsLanguage,
    }).catch((err) => {
      console.error("Failed to save paths:", err);
    });
  },
  load: async () => {
    if (get().loaded) return;
    try {
      const res = await invoke<{
        python_path?: string;
        comfy_path?: string;
        tts_model_path?: string;
        tts_config_path?: string;
        tts_speaker?: string;
        tts_language?: string;
      }>("load_paths");
      const detected = await invoke<string>("detect_python");
      set({
        pythonPath: res.python_path || "",
        defaultPythonPath: detected,
        comfyPath: res.comfy_path || "",
        ttsModelPath: res.tts_model_path || "",
        ttsConfigPath: res.tts_config_path || "",
        ttsSpeaker: res.tts_speaker || "",
        ttsLanguage: res.tts_language || "",
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
