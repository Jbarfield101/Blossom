import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ComfyTutorialState {
  showTutorial: boolean;
  setShowTutorial: (show: boolean) => void;
}

export const useComfyTutorial = create<ComfyTutorialState>()(
  persist(
    (set) => ({
      showTutorial: true,
      setShowTutorial: (show: boolean) => set({ showTutorial: show }),
    }),
    { name: "comfy-tutorial" }
  )
);

export type { ComfyTutorialState };
