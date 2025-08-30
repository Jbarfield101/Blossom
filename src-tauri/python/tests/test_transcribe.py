"""Tests for the diarized transcription helper."""

from __future__ import annotations

import os
import sys
import types

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import transcribe


def _setup_mocks(monkeypatch, segments, assigned):
    """Patch heavy models with light-weight dummies."""

    class DummyModel:
        def __init__(self, *_, **__):
            pass

        def transcribe(self, *_args, **_kwargs):
            return segments, None

    class DummyDiarizer:
        def __init__(self, *_, **__):
            pass

        def __call__(self, *_args, **_kwargs):
            return ["ignored"]

    dummy_whisperx = types.SimpleNamespace(
        DiarizationPipeline=DummyDiarizer,
        assign_word_speakers=lambda _d, _s: assigned,
    )

    monkeypatch.setattr(transcribe, "WhisperModel", DummyModel)
    monkeypatch.setattr(transcribe, "whisperx", dummy_whisperx)


def test_transcribe_basic(monkeypatch, tmp_path):
    audio = tmp_path / "a.wav"
    audio.write_bytes(b"fake")

    segments = [{"start": 0.0, "end": 1.0, "text": "hello world"}]
    assigned = [
        {"start": 0.0, "end": 1.0, "text": "hello world", "speaker": "SPEAKER_00"}
    ]
    _setup_mocks(monkeypatch, segments, assigned)

    res = transcribe.transcribe(str(audio))
    assert res == assigned


def test_transcribe_diarization(monkeypatch, tmp_path):
    audio = tmp_path / "b.wav"
    audio.write_bytes(b"fake")

    segments = [
        {"start": 0.0, "end": 1.0, "text": "hello"},
        {"start": 1.0, "end": 2.0, "text": "world"},
    ]
    assigned = [
        {"start": 0.0, "end": 1.0, "text": "hello", "speaker": "A"},
        {"start": 1.0, "end": 2.0, "text": "world", "speaker": "B"},
    ]
    _setup_mocks(monkeypatch, segments, assigned)

    res = transcribe.transcribe(str(audio))
    speakers = {s["speaker"] for s in res}
    assert speakers == {"A", "B"}

