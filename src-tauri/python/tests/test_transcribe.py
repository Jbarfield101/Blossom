"""Tests for the diarized transcription helper."""

from __future__ import annotations

import os
import sys
import types

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import transcribe


def _setup_mocks(monkeypatch, segments, diarized):
    """Patch heavy models with light-weight dummies."""

    class DummyModel:
        def __init__(self, *_, **__):
            pass

        def transcribe(self, *_args, **_kwargs):
            return segments, None

    class DummyPipeline:
        def __init__(self, *_, **__):
            pass

        @classmethod
        def from_pretrained(cls, *_args, **_kwargs):  # noqa: D401 - simple dummy
            return cls()

        def __call__(self, *_args, **_kwargs):
            class DummyAnnotation:
                def itertracks(self, yield_label=True):
                    for start, end, speaker in diarized:
                        segment = types.SimpleNamespace(start=start, end=end)
                        yield segment, None, speaker

            return DummyAnnotation()

    monkeypatch.setattr(transcribe, "WhisperModel", DummyModel)
    monkeypatch.setattr(transcribe, "Pipeline", DummyPipeline)


def test_transcribe_basic(monkeypatch, tmp_path):
    audio = tmp_path / "a.wav"
    audio.write_bytes(b"fake")

    segments = [{"start": 0.0, "end": 1.0, "text": "hello world"}]
    diarized = [(0.0, 1.0, "SPEAKER_00")]
    _setup_mocks(monkeypatch, segments, diarized)

    res = transcribe.transcribe(str(audio))
    assert res == [
        {"start": 0.0, "end": 1.0, "text": "hello world", "speaker": "SPEAKER_00"}
    ]


def test_transcribe_diarization(monkeypatch, tmp_path):
    audio = tmp_path / "b.wav"
    audio.write_bytes(b"fake")

    segments = [
        {"start": 0.0, "end": 1.0, "text": "hello"},
        {"start": 1.0, "end": 2.0, "text": "world"},
    ]
    diarized = [(0.0, 1.0, "A"), (1.0, 2.0, "B")]
    _setup_mocks(monkeypatch, segments, diarized)

    res = transcribe.transcribe(str(audio))
    speakers = {s["speaker"] for s in res}
    assert speakers == {"A", "B"}

