import numpy as np
from lofi.renderer import _seeded_rng


def test_seeded_rng_streams():
    seq1 = _seeded_rng(42, "a").integers(0, 100, size=5)
    seq2 = _seeded_rng(42, "a").integers(0, 100, size=5)
    seq3 = _seeded_rng(42, "b").integers(0, 100, size=5)
    assert np.array_equal(seq1, seq2)
    assert not np.array_equal(seq1, seq3)
