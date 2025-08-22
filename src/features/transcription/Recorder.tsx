import { useTranscription } from "./useTranscription";

export default function Recorder() {
  const { start, stop, recording, transcript } = useTranscription();
  return (
    <div>
      <button type="button" onClick={recording ? stop : start}>
        {recording ? "Stop" : "Record"}
      </button>
      {transcript && <p>{transcript}</p>}
    </div>
  );
}
