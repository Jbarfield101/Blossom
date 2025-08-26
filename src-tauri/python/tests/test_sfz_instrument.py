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
