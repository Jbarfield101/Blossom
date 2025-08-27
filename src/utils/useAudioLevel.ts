import { useEffect, useRef, useState } from "react";

/**
 * React hook that reports the current audio output level.
 *
 * It attaches an {@link AnalyserNode} to the provided source node and
 * returns a normalized RMS amplitude between `0` and `1`.
 * If no source is given the hook taps the user's microphone as a fallback
 * input.
 *
 * ```ts
 * const level = useAudioLevel(player);
 * ```
 *
 * @param source Optional {@link AudioNode} to tap. Defaults to the user's
 *               microphone input.
 */
export function useAudioLevel(source?: AudioNode): number {
  const [level, setLevel] = useState(0);
  const frame = useRef<number>();

  useEffect(() => {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx: AudioContext = (source?.context as AudioContext) || new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const data = new Uint8Array(analyser.fftSize);

    let micStream: MediaStream | undefined;
    let micNode: MediaStreamAudioSourceNode | undefined;
    if (source) {
      source.connect(analyser);
    } else if (navigator?.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          micStream = stream;
          micNode = ctx.createMediaStreamSource(stream);
          micNode.connect(analyser);
        })
        .catch(() => {
          /* ignore denial */
        });
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
      if (frame.current) cancelAnimationFrame(frame.current);
      if (source) {
        source.disconnect(analyser);
      } else {
        micNode?.disconnect();
        micStream?.getTracks().forEach((t) => t.stop());
        ctx.close();
      }
    };
  }, [source]);

  return level;
}
