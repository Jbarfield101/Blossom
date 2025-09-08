import os
import subprocess
from pathlib import Path
import sys
import json

import pytest

from fpdf import FPDF

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import pdf_tools


def test_add_pdf_and_search(monkeypatch, tmp_path):
    os.environ["BLOSSOM_OUTPUT_DIR"] = str(tmp_path)
    monkeypatch.setattr(pdf_tools, "BASE_DIR", Path(tmp_path))
    monkeypatch.setattr(pdf_tools, "INDEX_DIR", Path(tmp_path) / "Index")
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


def test_search_large_embeddings(monkeypatch, tmp_path):
    os.environ["BLOSSOM_OUTPUT_DIR"] = str(tmp_path)
    monkeypatch.setattr(pdf_tools, "BASE_DIR", Path(tmp_path))
    monkeypatch.setattr(pdf_tools, "INDEX_DIR", Path(tmp_path) / "Index")
    pdf_tools.ensure_dirs()

    conn = pdf_tools.get_db()
    # insert many random embeddings
    for i in range(1000):
        text = f"doc {i}"
        emb = pdf_tools.hash_embed(text).tobytes()
        conn.execute(
            "INSERT OR REPLACE INTO embeddings VALUES (?,?,?,?,?,?)",
            (f"id{i}", emb, f"doc{i}", 1, 1, text),
        )

    special_text = "special phrase"
    emb = pdf_tools.hash_embed(special_text).tobytes()
    conn.execute(
        "INSERT OR REPLACE INTO embeddings VALUES (?,?,?,?,?,?)",
        ("special", emb, "special_doc", 1, 1, special_text),
    )
    conn.commit()

    res = pdf_tools.search("special phrase", k=5)
    assert res["results"]
    assert res["results"][0]["doc_id"] == "special_doc"
    assert len(res["results"]) == 5


def test_validate_entry(monkeypatch, tmp_path):
    class Dummy:
        def __init__(self, code):
            self.returncode = code

    def run_ok(*args, **kwargs):
        return Dummy(0)

    def run_fail(*args, **kwargs):
        raise subprocess.CalledProcessError(1, args[0])

    monkeypatch.setattr(subprocess, "run", run_ok)
    dummy_tsx = tmp_path / "tsx"
    dummy_tsx.touch()
    monkeypatch.setattr(pdf_tools, "TSX_BIN", dummy_tsx)
    assert pdf_tools._validate_entry("lore", {"name": "Bob"})

    monkeypatch.setattr(subprocess, "run", run_fail)
    assert not pdf_tools._validate_entry("lore", {"name": "Bob"})



def _make_pdf(tmp_path, entries, use_bold=True, use_colon=False):
    """Create a simple PDF file with given entries.

    entries: list of (name, description)
    use_bold: whether to render headings in bold
    use_colon: whether to append ':' to headings
    """
    pdf = FPDF()
    pdf.add_page()
    for name, desc in entries:
        heading = f"{name}:" if use_colon else name
        pdf.set_font("Helvetica", "B" if use_bold else "", 14)
        pdf.cell(0, 10, heading, ln=1)
        pdf.set_font("Helvetica", "", 12)
        pdf.multi_cell(0, 10, desc)
    path = tmp_path / "doc.pdf"
    pdf.output(str(path))
    return str(path)


def test_extract_rules_with_bold_headings(tmp_path):
    path = _make_pdf(tmp_path, [("Rule One", "Desc one"), ("Rule Two", "Desc two")], use_bold=True)

    def fake_llm(text, prompt=None):
        return json.dumps({"tags": ["test"], "sections": {"a": "b"}})

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(pdf_tools, "_llm_extract", fake_llm)
    res = pdf_tools.extract_rules(path)
    monkeypatch.undo()
    names = [r["name"] for r in res["rules"]]
    assert names == ["Rule One", "Rule Two"]
    assert res["rules"][0]["tags"] == ["test"]


def test_extract_rules_with_colon_headings(tmp_path):
    entries = [("RULE THREE", "Third desc"), ("RULE FOUR", "Fourth desc")]
    path = _make_pdf(tmp_path, entries, use_bold=False, use_colon=True)

    def fake_llm(text, prompt=None):
        return json.dumps({"tags": ["test"], "sections": {"c": "d"}})

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(pdf_tools, "_llm_extract", fake_llm)
    res = pdf_tools.extract_rules(path)
    monkeypatch.undo()
    names = [r["name"] for r in res["rules"]]
    assert names == ["RULE THREE", "RULE FOUR"]
    assert res["rules"][0]["tags"] == ["test"]


def test_extract_spells(tmp_path):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "", 12)
    pdf.multi_cell(0, 10, "Magic Missile\nA bolt of force.")
    path = tmp_path / "spells.pdf"
    pdf.output(str(path))

    def fake_llm(text, prompt=None):
        return json.dumps({"tags": ["evocation"], "sections": {"level": "1"}})

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(pdf_tools, "_llm_extract", fake_llm)
    res = pdf_tools.extract_spells(str(path))
    monkeypatch.undo()
    spells = res["spells"]
    assert spells[0]["name"] == "Magic Missile"
    assert spells[0]["tags"] == ["evocation"]
    assert spells[0]["sections"] == {"level": "1"}


def test_extract_lore(tmp_path):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 10, "Name: Ancient Forest", ln=1)
    pdf.cell(0, 10, "Summary: A mythic wood", ln=1)
    pdf.cell(0, 10, "Tags: history", ln=1)
    pdf.cell(0, 10, "Location: North", ln=1)
    pdf.cell(0, 10, "Hooks: Explore", ln=1)
    pdf.cell(0, 10, "Extra: Hidden ruins", ln=1)
    path = tmp_path / "lore.pdf"
    pdf.output(str(path))

    res = pdf_tools.extract_lore(str(path))
    lore = res["lore"][0]
    assert lore["name"] == "Ancient Forest"
    assert lore["tags"] == ["history"]
    assert lore["sections"].get("extra") == "Hidden ruins"
