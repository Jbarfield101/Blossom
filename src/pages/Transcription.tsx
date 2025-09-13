import Recorder from "../features/transcription/Recorder";
import BackButton from "../components/BackButton";

export default function Transcription() {
  return (
    <div style={{ padding: 20 }}>
      <BackButton />
      <h1>Transcription</h1>
      <Recorder />
    </div>
  );
}
