"""Audio transcription with speaker diarization.

Uses ``faster-whisper`` for speech recognition and ``pyannote.audio``
for speaker diarization. The main :func:`transcribe` function returns a
list of segments, each containing the recognized text along with
speaker label and timestamps.

The heavy ML dependencies are optional at runtime so that the module is
easy to mock in unit tests.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict, List

try:  # pragma: no cover - heavy deps are optional at runtime
    from faster_whisper import WhisperModel  # type: ignore
except Exception:  # pragma: no cover
    WhisperModel = None  # type: ignore

try:  # pragma: no cover
    from pyannote.audio import Pipeline  # type: ignore
except Exception:  # pragma: no cover
    Pipeline = None  # type: ignore


def transcribe(audio_path: str, model_size: str = "tiny") -> List[Dict[str, Any]]:
    """Transcribe ``audio_path`` and return diarized segments.

    Each segment in the returned list contains ``speaker``, ``start``,
    ``end`` and ``text`` fields.
    """

    if WhisperModel is None or Pipeline is None:  # pragma: no cover - handled in tests
        raise RuntimeError("faster-whisper and pyannote.audio are required")

    model = WhisperModel(model_size, device="cpu")
    segments, _ = model.transcribe(audio_path, word_timestamps=False)

    pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization", device="cpu")
    diarization = pipeline(audio_path)

    diarized: List[Dict[str, Any]] = []
    for segment, _, speaker in diarization.itertracks(yield_label=True):
        diarized.append({"start": float(segment.start), "end": float(segment.end), "speaker": speaker})

    def speaker_for_time(timestamp: float) -> str:
        for seg in diarized:
            if seg["start"] <= timestamp <= seg["end"]:
                return seg["speaker"]
        return "UNKNOWN"

    results: List[Dict[str, Any]] = []
    for seg in segments:
        start = float(getattr(seg, "start", seg["start"]))
        end = float(getattr(seg, "end", seg["end"]))
        text = getattr(seg, "text", seg["text"])
        speaker = speaker_for_time((start + end) / 2)
        results.append({"speaker": speaker, "start": start, "end": end, "text": text.strip()})

    return results


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: transcribe.py <audio_path>", file=sys.stderr)
        return 1

    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        print("audio file not found", file=sys.stderr)
        return 1

    try:
        segments = transcribe(audio_path)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(json.dumps(segments, ensure_ascii=False))
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())

