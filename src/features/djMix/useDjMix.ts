import { invoke } from "@tauri-apps/api/core";
import { usePaths } from "../paths/usePaths";

export function useDjMix() {
  const { ttsModelPath, ttsConfigPath, ttsSpeaker, ttsLanguage } = usePaths();
  return async (specs: string[], out: string, host = false) => {
    await invoke("dj_mix", {
      specs,
      out,
      host,
      tts_model_path: ttsModelPath,
      tts_config: ttsConfigPath,
      tts_speaker: ttsSpeaker,
      tts_language: ttsLanguage,
    });
  };
}
