import * as Tone from 'tone';

/**
 * Render text to an audio buffer using the browser's SpeechSynthesis API.
 * Falls back to an empty buffer if the API is unavailable.
 */
export async function renderSpokenWord(text: string): Promise<Tone.ToneAudioBuffer> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return new Tone.ToneAudioBuffer();
  }

  return new Promise<Tone.ToneAudioBuffer>((resolve) => {
    const ctx = Tone.getContext();
    const dest = ctx.createMediaStreamDestination();
    const recorder = new MediaRecorder(dest.stream);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks);
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      resolve(new Tone.ToneAudioBuffer(audioBuffer));
    };

    recorder.start();
    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utter);
    utter.onend = () => recorder.stop();
  });
}

/**
 * Convert an uploaded audio File into a ToneAudioBuffer.
 */
export async function fileToBuffer(file: File): Promise<Tone.ToneAudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await Tone.getContext().decodeAudioData(arrayBuffer);
  return new Tone.ToneAudioBuffer(audioBuffer);
}

/**
 * Apply a simple vinyl/tape style effect chain to a Player.
 */
export function applyVinylEffect(player: Tone.Player): Tone.ToneAudioNode {
  const crusher = new Tone.BitCrusher(8);
  const wobble = new Tone.Vibrato(0.3, 0.2);
  const filter = new Tone.Filter({ frequency: 8000, type: 'lowpass' });
  player.chain(crusher, wobble, filter);
  return filter;
}

/**
 * Schedule a spoken word player to repeat every few measures.
 */
export function scheduleSpokenWord(player: Tone.Player, measures = 32) {
  const interval = `${measures}m`;
  Tone.Transport.scheduleRepeat((time) => {
    if (player.buffer && player.buffer.length > 0) {
      player.start(time);
    }
  }, interval);
}

