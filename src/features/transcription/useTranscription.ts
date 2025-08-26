import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useTranscription() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const media = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);

  async function start() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      const message =
        err?.name === "NotAllowedError"
          ? "Microphone permission denied."
          : `Error accessing microphone: ${err?.message ?? err}`;
      setTranscript(message);
      return;
    }

    media.current = new MediaRecorder(stream.current);
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
      } finally {
        chunks.current = [];
        stream.current = null;
        media.current = null;
      }
    };
    media.current.start();
    setRecording(true);
  }

  function stop() {
    stream.current?.getTracks().forEach((track) => track.stop());
    media.current?.stop();
    media.current = null;
    stream.current = null;
    setRecording(false);
  }

  return { start, stop, recording, transcript };
}
