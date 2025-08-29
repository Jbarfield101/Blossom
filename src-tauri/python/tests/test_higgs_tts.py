import os
import sys

import pytest

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import higgs_tts  # noqa: E402


def test_resolve_ref_audio(monkeypatch, tmp_path):
    ref = tmp_path / "voice.wav"
    ref.write_bytes(b"00")
    monkeypatch.setitem(higgs_tts.EXAMPLE_VOICES, "belinda", str(ref))
    assert higgs_tts.resolve_ref_audio("belinda") == str(ref)
    assert higgs_tts.resolve_ref_audio(str(ref)) == str(ref)
