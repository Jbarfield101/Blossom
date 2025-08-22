import os
import sys
import json

try:
    import vosk  # type: ignore
    import wave
except Exception as e:
    print(f"failed to import dependencies: {e}", file=sys.stderr)
    sys.exit(1)


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: transcribe.py <audio_path>", file=sys.stderr)
        return 1
    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        print("audio file not found", file=sys.stderr)
        return 1
    model_path = os.environ.get("VOSK_MODEL_PATH")
    if not model_path or not os.path.isdir(model_path):
        print("VOSK_MODEL_PATH not set", file=sys.stderr)
        return 1
    wf = wave.open(audio_path, "rb")
    model = vosk.Model(model_path)
    rec = vosk.KaldiRecognizer(model, wf.getframerate())
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        rec.AcceptWaveform(data)
    result = json.loads(rec.FinalResult())
    print(result.get("text", ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
