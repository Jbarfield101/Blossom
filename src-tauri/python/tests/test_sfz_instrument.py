import os
import sys
import numpy as np
import pytest

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import lofi.renderer as renderer  # noqa: E402


def test_sfz_sampler_used(monkeypatch, tmp_path):
    calls = []

    class DummySampler:
        def render(self, freq, ms):
            calls.append((freq, ms))
            return np.zeros(int(ms * renderer.SR / 1000), dtype=np.float32)

    monkeypatch.setattr(renderer.SfzSampler, "from_file", staticmethod(lambda p: DummySampler()))
    sfz_file = tmp_path / "dummy.sfz"
    sfz_file.write_text("<region>\n")
    spec = {
        "bpm": 80,
        "seed": 1,
        "structure": [{"name": "A", "bars": 1}],
        "sfz_instrument": str(sfz_file),
    }
    renderer.render_from_spec(spec)
    assert calls, "Sampler render was not invoked"


def _dummy_sampler_factory(calls):
    class DummySampler:
        def render(self, freq, ms):
            calls.append((freq, ms))
            return np.zeros(int(ms * renderer.SR / 1000), dtype=np.float32)

    return DummySampler


def test_sfz_chords_sampler_used(monkeypatch, tmp_path):
    calls = []
    DummySampler = _dummy_sampler_factory(calls)
    monkeypatch.setattr(
        renderer.SfzSampler, "from_file", staticmethod(lambda p: DummySampler())
    )
    sfz_file = tmp_path / "dummy.sfz"
    sfz_file.write_text("<region>\n")
    spec = {
        "bpm": 80,
        "seed": 1,
        "structure": [{"name": "A", "bars": 1}],
        "sfz_chords": str(sfz_file),
    }
    renderer.render_from_spec(spec)
    assert calls, "Chord sampler render was not invoked"


def test_sfz_pads_sampler_used(monkeypatch, tmp_path):
    calls = []
    DummySampler = _dummy_sampler_factory(calls)
    monkeypatch.setattr(
        renderer.SfzSampler, "from_file", staticmethod(lambda p: DummySampler())
    )
    sfz_file = tmp_path / "dummy.sfz"
    sfz_file.write_text("<region>\n")
    spec = {
        "bpm": 80,
        "seed": 1,
        "structure": [{"name": "A", "bars": 1}],
        "sfz_pads": str(sfz_file),
    }
    renderer.render_from_spec(spec)
    assert calls, "Pad sampler render was not invoked"


def test_sfz_bass_sampler_used(monkeypatch, tmp_path):
    calls = []
    DummySampler = _dummy_sampler_factory(calls)
    monkeypatch.setattr(
        renderer.SfzSampler, "from_file", staticmethod(lambda p: DummySampler())
    )
    sfz_file = tmp_path / "dummy.sfz"
    sfz_file.write_text("<region>\n")
    spec = {
        "bpm": 80,
        "seed": 1,
        "structure": [{"name": "A", "bars": 1}],
        "sfz_bass": str(sfz_file),
        "instruments": ["upright bass"],
    }
    renderer.render_from_spec(spec)
    assert calls, "Bass sampler render was not invoked"
