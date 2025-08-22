import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useTranscription() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const media = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    media.current = new MediaRecorder(stream);
    chunks.current = [];
    media.current.ondataavailable = (e) => chunks.current.push(e.data);
    media.current.onstop = async () => {
      const blob = new Blob(chunks.current, { type: "audio/wav" });
      const buf = await blob.arrayBuffer();
      const data = Array.from(new Uint8Array(buf));
      try {
        const text = await invoke<string>("transcribe_audio", { data });
        setTranscript(text.trim());
      } catch (err: any) {
        setTranscript(`Error: ${err}`);
      }
    };
    media.current.start();
    setRecording(true);
  }

  function stop() {
    media.current?.stop();
    setRecording(false);
  }

  return { start, stop, recording, transcript };
}
