import { invoke } from "@tauri-apps/api/core";
export function useDjMix() {
  return async (specs: string[], out: string, host = false) => {
    await invoke("dj_mix", {
      specs,
      out,
      host,
    });
  };
}
