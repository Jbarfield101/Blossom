import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import * as Tone from "tone";

interface UseHiggsVoice {
  speak: (text: string, voiceId: string) => Promise<void>;
  status: "idle" | "loading" | "playing" | "error";
  error: string | null;
}

export function useHiggsVoice(): UseHiggsVoice {
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const speak = async (text: string, voiceId: string) => {
    setStatus("loading");
    setError(null);
    try {
      const wav = (await invoke("higgs_tts", { text, speaker: voiceId })) as number[] | Uint8Array;
      const uint8 = wav instanceof Uint8Array ? wav : new Uint8Array(wav);
      const audioBuffer = await Tone.context.decodeAudioData(uint8.buffer);
      const player = new Tone.Player().toDestination();
      player.buffer = audioBuffer;
      player.onstop = () => setStatus("idle");
      await Tone.start();
      player.start();
      setStatus("playing");
    } catch (err) {
      setError(String(err));
      setStatus("error");
    }
  };

  return { speak, status, error };
}

export type { UseHiggsVoice };
