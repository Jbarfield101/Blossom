import numpy as np
from pydub import AudioSegment
import os
import sys
import types

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

dummy_renderer = types.ModuleType("renderer")
dummy_renderer.render_from_spec = lambda spec: (AudioSegment.silent(duration=1), 120)
dummy_io = types.ModuleType("io_utils")
dummy_io.ensure_wav_bitdepth = lambda seg: seg
lofi_pkg = types.ModuleType("lofi")
lofi_pkg.renderer = dummy_renderer
lofi_pkg.io_utils = dummy_io
sys.modules.setdefault("lofi", lofi_pkg)
sys.modules.setdefault("lofi.renderer", dummy_renderer)
sys.modules.setdefault("lofi.io_utils", dummy_io)

import dj_mix


def test_tts_audio(monkeypatch):
    class DummySynth:
        output_sample_rate = 22050

    class DummyTTS:
        def __init__(self, model_path, config_path):
            self.model_path = model_path
            self.config_path = config_path
            self.synthesizer = DummySynth()

        def tts(self, text, speaker=None, language=None):
            assert text == "hi"
            return np.array([0.0, 0.5, -0.5])

    monkeypatch.setattr(dj_mix, "TTS", DummyTTS)
    audio = dj_mix.tts_audio("hi", "model", "config", speaker="spk", language="en")
    assert isinstance(audio, AudioSegment)
    assert audio.frame_rate == 22050
    assert audio.channels == 1
    assert audio.sample_width == 2
