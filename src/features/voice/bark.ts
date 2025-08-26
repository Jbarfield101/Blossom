import { invoke } from "@tauri-apps/api/core";
import * as Tone from "tone";

/**
 * Generate speech audio using the Bark TTS backend.
 *
 * @param text Text to speak
 * @param speaker Voice identifier
 * @returns A ToneAudioBuffer containing the spoken audio
 */
export async function generateAudio(text: string, speaker: string): Promise<Tone.ToneAudioBuffer> {
  const data = await invoke<Uint8Array>("bark_tts", { text, speaker });
  const ctx = Tone.getContext();
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  return new Tone.ToneAudioBuffer(audioBuffer);
}
