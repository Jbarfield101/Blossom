import json
import os
import sys
import pytest

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from lofi_gpu_hq import _load_instruments, DEFAULT_INSTRUMENTS_PATH


def test_instruments_json_schema():
    data = _load_instruments(DEFAULT_INSTRUMENTS_PATH)
    assert isinstance(data["alias"], dict)
    assert isinstance(data["canonical"], list)
    assert all(isinstance(k, str) and isinstance(v, str) for k, v in data["alias"].items())
    assert all(isinstance(v, str) for v in data["canonical"])


def test_instruments_json_invalid(tmp_path):
    bad = tmp_path / "bad.json"
    bad.write_text(json.dumps({"alias": {"x": 1}, "canonical": "nope"}))
    with pytest.raises(ValueError):
        _load_instruments(str(bad))
