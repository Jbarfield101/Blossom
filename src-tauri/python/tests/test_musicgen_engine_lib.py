import os
import numpy as np
import soundfile as sf

from musicgen_engine_lib import MusicGenEngine


def _tmp_wav(tmp_path, seconds=1, sr=22050):
    t = np.linspace(0, seconds, seconds * sr, endpoint=False, dtype=np.float32)
    y = 0.3 * np.sin(2 * np.pi * 220.0 * t).astype(np.float32)
    path = os.path.join(tmp_path, 'melody.wav')
    sf.write(path, y, sr)
    return path, y, sr


def test_generate_text_returns_array():
    eng = MusicGenEngine(sample_rate=16000)
    out = eng.generate(prompt='Chill lofi beat with warm pads', seconds=2)
    assert isinstance(out, np.ndarray)
    assert out.dtype == np.float32
    assert out.ndim == 1
    assert out.shape[0] == 2 * 16000
    assert np.all(np.isfinite(out))
    assert np.max(np.abs(out)) <= 1.0


def test_generate_with_melody_array():
    eng = MusicGenEngine(sample_rate=16000)
    sr = 22050
    t = np.linspace(0, 1.5, int(1.5 * sr), endpoint=False, dtype=np.float32)
    melody = 0.2 * np.sin(2 * np.pi * 330.0 * t)
    out = eng.generate(prompt='Melodic ambient', seconds=2, melody=melody, melody_sr=sr)
    assert isinstance(out, np.ndarray)
    assert out.shape[0] == 2 * 16000
    assert np.max(np.abs(out)) <= 1.0


def test_generate_with_melody_path(tmp_path):
    eng = MusicGenEngine(sample_rate=8000)
    path, y, sr = _tmp_wav(tmp_path, seconds=1, sr=11025)
    out = eng.generate(prompt='Cinematic', seconds=2, melody=path, melody_sr=sr)
    assert isinstance(out, np.ndarray)
    assert out.shape[0] == 2 * 8000
    assert np.max(np.abs(out)) <= 1.0
