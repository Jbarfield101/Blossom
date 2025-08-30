"""Audio transcription with speaker diarization.

Uses faster-whisper for transcription and WhisperX for speaker
diarization.  The main `transcribe` function returns a list of segments,
each containing the recognized text along with speaker label and
timestamps.

This module degrades gracefully if the heavy dependencies are not
installed, making it easier to mock in unit tests.
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
    import whisperx  # type: ignore
except Exception:  # pragma: no cover
    whisperx = None  # type: ignore


def transcribe(audio_path: str, model_size: str = "tiny") -> List[Dict[str, Any]]:
    """Transcribe ``audio_path`` and return diarized segments.

    Each segment in the returned list contains ``speaker``, ``start``,
    ``end`` and ``text`` fields.
    """

    if WhisperModel is None or whisperx is None:  # pragma: no cover - handled in tests
        raise RuntimeError("faster-whisper and whisperx are required")

    model = WhisperModel(model_size, device="cpu")
    segments, _ = model.transcribe(audio_path, word_timestamps=True)

    diarizer = whisperx.DiarizationPipeline(device="cpu")
    diarize_segments = diarizer(audio_path)

    segment_list: List[Dict[str, Any]] = []
    for seg in segments:
        segment_list.append(
            {
                "start": float(getattr(seg, "start", seg["start"])),
                "end": float(getattr(seg, "end", seg["end"])),
                "text": getattr(seg, "text", seg["text"]),
                "words": getattr(seg, "words", seg.get("words", [])),
            }
        )

    assigned = whisperx.assign_word_speakers(diarize_segments, segment_list)
    if isinstance(assigned, dict) and "segments" in assigned:
        assigned_segments = assigned["segments"]
    else:
        assigned_segments = assigned

    result = [
        {
            "speaker": seg.get("speaker", "UNKNOWN"),
            "start": float(seg["start"]),
            "end": float(seg["end"]),
            "text": seg["text"].strip(),
        }
        for seg in assigned_segments
    ]
    return result


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

