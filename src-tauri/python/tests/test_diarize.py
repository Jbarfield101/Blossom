"""Tests for the speaker diarization helper."""

from __future__ import annotations

import os
import sys
import types

import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import diarize


def _setup_mocks(monkeypatch, diarized):
    """Patch heavy models with light-weight dummies."""

    class DummyPipeline:
        def __init__(self, *_, **__):
            pass

        @classmethod
        def from_pretrained(cls, *_, **__):
            return cls()

        def __call__(self, *_args, **_kwargs):
            class DummyAnnotation:
                def itertracks(self, yield_label=True):
                    for start, end, speaker in diarized:
                        segment = types.SimpleNamespace(start=start, end=end)
                        yield segment, None, speaker

            return DummyAnnotation()

    class DummyEmbedder:
        def __init__(self, *_, **__):
            pass

        @classmethod
        def from_pretrained(cls, *_, **__):
            return cls()

        def __call__(self, *, file, start=None, end=None):  # noqa: D401 - simple dummy
            if file == "alice.wav":
                return np.array([1.0, 0.0])
            if file == "bob.wav":
                return np.array([0.0, 1.0])
            if file == "mix.wav" and start == 0.0:
                return np.array([1.0, 0.0])
            if file == "mix.wav" and start == 1.0:
                return np.array([0.0, 1.0])
            return np.zeros(2)

    monkeypatch.setattr(diarize, "Pipeline", DummyPipeline)
    monkeypatch.setattr(diarize, "Model", DummyEmbedder)
    diarize.EMBEDDING_MODEL = None
    diarize.PLAYER_EMBEDDINGS.clear()


def test_diarize_basic(monkeypatch):
    _setup_mocks(monkeypatch, [(0.0, 1.0, "A"), (1.0, 2.0, "B")])
    res = diarize.diarize("mix.wav")
    assert all("player" not in seg for seg in res)
    assert {seg["speaker"] for seg in res} == {"A", "B"}


def test_diarize_with_enrollment(monkeypatch):
    _setup_mocks(monkeypatch, [(0.0, 1.0, "SPEAKER_00"), (1.0, 2.0, "SPEAKER_01")])
    clips = {"alice": ["alice.wav"], "bob": ["bob.wav"]}
    res = diarize.diarize("mix.wav", enrollment_clips=clips)
    players = [seg.get("player") for seg in res]
    assert players == ["alice", "bob"]
