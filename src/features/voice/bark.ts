import { invoke } from "@tauri-apps/api/core";
import * as Tone from "tone";

/**
 * Generate speech audio using the Bark TTS backend.
 *
 * @param text Text to speak
 * @param speaker Voice identifier
 * @param onStatus Optional callback for status updates
 * @returns A ToneAudioBuffer containing the spoken audio
 */
export async function generateAudio(
  text: string,
  speaker: string,
  onStatus?: (msg: string) => void
): Promise<Tone.ToneAudioBuffer> {
  if (!text.trim()) {
    throw new Error("Bark TTS requires non-empty text");
  }
  if (!speaker.trim()) {
    throw new Error("Bark TTS requires a speaker");
  }

  let data: Uint8Array;
  try {
    onStatus?.("Invoking Bark TTS backend…");
    data = await invoke<Uint8Array>("bark_tts", { text, speaker });
    onStatus?.("Bark TTS invocation complete");
  } catch (err) {
    throw new Error(
      `Bark TTS invocation failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const ctx = Tone.getContext();
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

  let audioBuffer: AudioBuffer;
  try {
    onStatus?.("Decoding audio data…");
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    onStatus?.("Decoding complete");
  } catch (err) {
    throw new Error(
      `Bark TTS audio decode failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return new Tone.ToneAudioBuffer(audioBuffer);
}
