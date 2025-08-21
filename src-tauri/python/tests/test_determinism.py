import hashlib
import os
import sys
import logging
import numpy as np
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import lofi_gpu_hq  # noqa: E402


EXPECTED_RMS = 0.165903
EXPECTED_HASH = "82fdd90872a6d191afc972db5890d113a419fa53c9239d7970063d64d1e3ad90"


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
    audio, _ = lofi_gpu_hq.render_from_spec(spec)
    assert any(
        isinstance(r.msg, dict) and r.msg.get("stage") == "debug" for r in caplog.records
    )
    samples = np.array(audio.get_array_of_samples()).astype(np.int16)
    rms = np.sqrt(np.mean((samples / 32768.0) ** 2))
    buf_hash = hashlib.sha256(samples.tobytes()).hexdigest()
    assert round(rms, 6) == EXPECTED_RMS
    assert buf_hash == EXPECTED_HASH
