import { useEffect, useRef, useState } from "react";
import { useAudioDefaults } from "../features/audioDefaults/useAudioDefaults";

/**
 * React hook that reports the current audio output level.
 *
 * It attaches an {@link AnalyserNode} to the provided source node and
 * returns a normalized RMS amplitude between `0` and `1`.
 * If no source is given the hook taps system audio when available and
 * falls back to the user's microphone as a final option.
 *
 * ```ts
 * const level = useAudioLevel(player);
 * ```
 *
 * @param source Optional {@link AudioNode} to tap. Defaults to system audio or
 *               the user's microphone input.
 */
export function useAudioLevel(source?: AudioNode): number {
  const [level, setLevel] = useState(0);
  const frame = useRef<number>();
  const micEnabled = useAudioDefaults((s) => s.micEnabled);
  useEffect(() => {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx: AudioContext = (source?.context as AudioContext) || new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const data = new Uint8Array(analyser.fftSize);

    let stream: MediaStream | undefined;
    let streamNode: MediaStreamAudioSourceNode | undefined;
    let active = true;
    if (source) {
      source.connect(analyser);
    } else if (navigator?.mediaDevices && micEnabled) {
      (async () => {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: false,
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch {
            /* ignore denial */
            return;
          }
        }
        if (!active || ctx.state === "closed" || !stream) return;
        streamNode = ctx.createMediaStreamSource(stream);
        if (!active || ctx.state === "closed") return;
        streamNode.connect(analyser);
      })();
    }

    const update = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128 - 1;
        sum += v * v;
      }
      setLevel(Math.sqrt(sum / data.length));
      frame.current = requestAnimationFrame(update);
    };
    update();

    return () => {
      active = false;
      if (frame.current) cancelAnimationFrame(frame.current);
      if (source) {
        source.disconnect(analyser);
      } else {
        streamNode?.disconnect();
        stream?.getTracks().forEach((t) => t.stop());
        ctx.close();
      }
    };
  }, [source, micEnabled]);

  return level;
}
