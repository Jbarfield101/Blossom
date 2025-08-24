import hashlib
import os
import sys
import logging
import numpy as np
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import lofi.renderer as renderer  # noqa: E402


EXPECTED_RMS = 0.165903
EXPECTED_HASH = "f29a48bd8e5d4273903e7f537259d012f3890209d45c08b7d3ea73d600c37a56"


def test_deterministic_render(caplog):
    caplog.set_level(logging.DEBUG)
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
    audio, _ = renderer.render_from_spec(spec)
    assert any(
        isinstance(r.msg, dict) and r.msg.get("stage") == "debug" for r in caplog.records
    )
    samples = np.array(audio.get_array_of_samples()).astype(np.int16)
    rms = np.sqrt(np.mean((samples / 32768.0) ** 2))
    buf_hash = hashlib.sha256(samples.tobytes()).hexdigest()
    assert round(rms, 6) == EXPECTED_RMS
    assert buf_hash == EXPECTED_HASH
