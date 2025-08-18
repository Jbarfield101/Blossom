import { useEffect, useRef } from "react";

interface WaveformProps {
  src: string;
}

export default function Waveform({ src }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function draw() {
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const res = await fetch(src);
        const buf = await res.arrayBuffer();
        const ctx = new AudioCtx();
        const audio = await ctx.decodeAudioData(buf);
        const data = audio.getChannelData(0);
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const c = canvas.getContext("2d");
        if (!c) return;
        const { width, height } = canvas;
        c.clearRect(0, 0, width, height);
        c.strokeStyle = "#3a82f6";
        c.beginPath();
        const step = Math.ceil(data.length / width);
        for (let i = 0; i < width; i++) {
          const start = i * step;
          let min = 1, max = -1;
          for (let j = 0; j < step && start + j < data.length; j++) {
            const v = data[start + j];
            if (v < min) min = v;
            if (v > max) max = v;
          }
          const y1 = (1 - (max + 1) / 2) * height;
          const y2 = (1 - (min + 1) / 2) * height;
          c.moveTo(i, y1);
          c.lineTo(i, y2);
        }
        c.stroke();
      } catch (e) {
        // ignore fetch or decoding errors in preview
      }
    }
    draw();
    return () => {
      cancelled = true;
    };
  }, [src]);

  return <canvas ref={canvasRef} width={120} height={30} />;
}
