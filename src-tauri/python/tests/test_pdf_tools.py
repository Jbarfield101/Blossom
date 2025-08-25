import os
import subprocess
from pathlib import Path
import sys

import pytest

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import pdf_tools


def test_add_pdf_and_search(monkeypatch, tmp_path):
    os.environ["BLOSSOM_OUTPUT_DIR"] = str(tmp_path)
    dummy_pdf = tmp_path / "doc.pdf"
    dummy_pdf.write_bytes(b"dummy")

    def fake_extract(pdf_path: Path, doc_dir: Path):
        pages = ["hello world", "goodbye world"]
        info = {"title": "Test", "pages": len(pages)}
        return pages, info

    monkeypatch.setattr(pdf_tools, "extract_pages", fake_extract)

    result = pdf_tools.add_pdf(str(dummy_pdf))
    assert result["pages"] == 2
    doc_id = result["doc_id"]

    search_res = pdf_tools.search("hello")
    assert search_res["results"]
    first = search_res["results"][0]
    assert first["doc_id"] == doc_id
    assert "hello world" in first["text"]


def test_validate_entry(monkeypatch):
    class Dummy:
        def __init__(self, code):
            self.returncode = code

    def run_ok(*args, **kwargs):
        return Dummy(0)

    def run_fail(*args, **kwargs):
        return Dummy(1)

    monkeypatch.setattr(subprocess, "run", run_ok)
    assert pdf_tools._validate_entry("npc", {"name": "Bob"})

    monkeypatch.setattr(subprocess, "run", run_fail)
    assert not pdf_tools._validate_entry("npc", {"name": "Bob"})
