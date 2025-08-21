import hashlib
import os
import sys
import numpy as np
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from lofi.renderer import render_from_spec  # noqa: E402


EXPECTED_RMS = 0.165555
EXPECTED_HASH = "9a76d1f1cc2268dfb1ba732fa643cf0086eb4dfbd57175c3a1dd0c21d8e46ef6"


def test_deterministic_render():
    spec = {
        "title": "test",
        "bpm": 80,
        "seed": 12345,
        "key": "C",
        "structure": [{"name": "A", "bars": 2, "chords": ["Cmaj7", "Fmaj7"]}],
        "preset": "Warm Cassette",
        "ambience": ["vinyl"],
        "ambience_level": 0.5,
        "instruments": ["piano"],
    }
    audio, _ = render_from_spec(spec)
    samples = np.array(audio.get_array_of_samples()).astype(np.int16)
    rms = np.sqrt(np.mean((samples / 32768.0) ** 2))
    buf_hash = hashlib.sha256(samples.tobytes()).hexdigest()
    assert round(rms, 6) == EXPECTED_RMS
    assert buf_hash == EXPECTED_HASH
