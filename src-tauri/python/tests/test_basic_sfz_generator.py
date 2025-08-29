import json
import os
import sys

import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import basic_sfz_generator  # noqa: E402


class DummySampler:
    @staticmethod
    def from_file(path):
        return DummySampler()

    def render(self, freq, ms_per_note):
        return np.array([1.0, -1.0], dtype=np.float32)


def _patch_sampler_and_writer(monkeypatch, recorded):
    monkeypatch.setattr(basic_sfz_generator, "SfzSampler", DummySampler)

    def fake_write(path, data, sr):  # pragma: no cover - simple spy
        recorded["path"] = str(path)
        recorded["data"] = data

    monkeypatch.setattr(basic_sfz_generator.sf, "write", fake_write)


def test_cli_accepts_spec_json(monkeypatch, tmp_path):
    spec = {
        "sfz_path": "dummy.sfz",
        "key": "C",
        "bpm": 120,
        "out": str(tmp_path / "from_spec.wav"),
    }
    recorded: dict[str, str] = {}
    _patch_sampler_and_writer(monkeypatch, recorded)
    argv = ["basic_sfz_generator.py", "--spec-json", json.dumps(spec)]
    monkeypatch.setattr(sys, "argv", argv)
    basic_sfz_generator.main()
    assert recorded["path"] == spec["out"]


def test_cli_out_overrides_spec(monkeypatch, tmp_path):
    spec = {
        "sfz_path": "dummy.sfz",
        "key": "C",
        "bpm": 120,
        "out": str(tmp_path / "from_spec.wav"),
    }
    override = tmp_path / "override.wav"
    recorded: dict[str, str] = {}
    _patch_sampler_and_writer(monkeypatch, recorded)
    argv = [
        "basic_sfz_generator.py",
        "--spec-json",
        json.dumps(spec),
        "--out",
        str(override),
    ]
    monkeypatch.setattr(sys, "argv", argv)
    basic_sfz_generator.main()
    assert recorded["path"] == str(override)


def test_render_spec_normalizes_audio(monkeypatch, tmp_path):
    spec = {
        "sfz_path": "dummy.sfz",
        "key": "C",
        "bpm": 120,
        "out": str(tmp_path / "norm.wav"),
    }
    recorded: dict[str, object] = {}
    _patch_sampler_and_writer(monkeypatch, recorded)
    basic_sfz_generator.render_spec(spec)
    data = recorded["data"]
    assert np.isclose(np.max(np.abs(data)), 0.7)


def test_render_spec_applies_gain(monkeypatch, tmp_path):
    spec = {
        "sfz_path": "dummy.sfz",
        "key": "C",
        "bpm": 120,
        "out": str(tmp_path / "gain.wav"),
        "gain": 0.5,
    }
    recorded: dict[str, object] = {}
    _patch_sampler_and_writer(monkeypatch, recorded)
    basic_sfz_generator.render_spec(spec)
    data = recorded["data"]
    assert np.isclose(np.max(np.abs(data)), 0.35)

