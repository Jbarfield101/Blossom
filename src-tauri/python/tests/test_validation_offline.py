import os
import sys
import shutil

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from pdf_tools import _validate_entry  # noqa: E402


def test_validate_entry_offline(monkeypatch, tmp_path):
    node = shutil.which("node")
    assert node is not None
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    os.symlink(node, bin_dir / "node")
    monkeypatch.setenv("PATH", str(bin_dir))

    payload = {
        "id": "1",
        "name": "Lore",
        "summary": "Test",
        "tags": ["tag"],
    }

    assert _validate_entry("lore", payload)
