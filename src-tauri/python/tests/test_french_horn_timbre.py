import os
import sys
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from lofi.renderer import _apply_melody_timbre


def test_french_horn_timbre_bandpass():
    rng = np.random.default_rng(0)
    x = rng.standard_normal(44100).astype(np.float32)
    y = _apply_melody_timbre(x, ["french horn"])
    rms_in = np.sqrt(np.mean(x**2))
    rms_out = np.sqrt(np.mean(y**2))
    assert 0 < rms_out < rms_in
