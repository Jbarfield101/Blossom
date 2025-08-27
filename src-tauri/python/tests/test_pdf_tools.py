import os
import subprocess
from pathlib import Path
import sys
import os
import json
import sqlite3

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


def test_validate_entry(monkeypatch):
    class Dummy:
        def __init__(self, code):
            self.returncode = code

    def run_ok(*args, **kwargs):
        return Dummy(0)

    def run_fail(*args, **kwargs):
        raise subprocess.CalledProcessError(1, args[0])

    monkeypatch.setattr(subprocess, "run", run_ok)
    assert pdf_tools._validate_entry("npc", {"name": "Bob"})

    monkeypatch.setattr(subprocess, "run", run_fail)
    assert not pdf_tools._validate_entry("npc", {"name": "Bob"})


def _make_npc_pdf(tmp_path, fields):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "", 12)
    for k, v in fields.items():
        pdf.cell(0, 10, f"{k}: {v}", ln=1)
    path = tmp_path / "npc.pdf"
    pdf.output(str(path))
    return str(path)


def test_extract_npcs_parses_appearance(tmp_path):
    path = _make_npc_pdf(
        tmp_path,
        {
            "Name": "Alice",
            "Species": "Elf",
            "Role": "Merchant",
            "Hooks": "Trade",
            "Tags": "npc",
            "Appearance": "Tall and slender",
            "Extra": "Value",
        },
    )
    res = pdf_tools.extract_npcs(path)
    npc = res["npcs"][0]
    assert npc["appearance"] == "Tall and slender"
    sections = npc.get("sections", {})
    assert "appearance" not in sections
    assert sections.get("extra") == "Value"


def test_extract_npcs_stats_traits_inventory_persist(tmp_path):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 10, "Name: Test NPC", ln=1)
    pdf.cell(0, 10, "Species: Human", ln=1)
    pdf.cell(0, 10, "Role: Warrior", ln=1)
    pdf.cell(0, 10, "Hooks: Quest", ln=1)
    pdf.cell(0, 10, "Tags: npc", ln=1)
    pdf.cell(0, 10, "Traits:", ln=1)
    pdf.multi_cell(0, 10, "- Brave\n- Loyal")
    pdf.cell(0, 10, "Inventory:", ln=1)
    pdf.multi_cell(0, 10, "- Longsword\n- Potion of healing\n- Rope with knots\n  50 ft")
    pdf.cell(0, 10, "Stats: STR 12 DEX 14 CON 13 INT 10 WIS 8 CHA 15", ln=1)
    pdf.cell(0, 10, "HP: 30", ln=1)
    pdf.cell(0, 10, "Level: 5", ln=1)
    path = tmp_path / "npc.pdf"
    pdf.output(str(path))

    db_path = tmp_path / "npcs.db"
    res = pdf_tools.extract_npcs(str(path), db_path)
    npc = res["npcs"][0]
    assert npc["abilities"]["strength"] == 12
    assert npc["hp"] == 30
    assert npc["level"] == 5
    assert npc["inventory"][-1] == "Rope with knots 50 ft"
    assert npc["quirks"] == ["Brave", "Loyal"]

    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT data FROM npcs WHERE id=?", (npc["id"],)).fetchone()
    assert row is not None
    stored = json.loads(row[0])
    assert stored["name"] == "Test NPC"


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
    res = pdf_tools.extract_rules(path)
    names = [r["name"] for r in res["rules"]]
    assert names == ["Rule One", "Rule Two"]


def test_extract_rules_with_colon_headings(tmp_path):
    entries = [("RULE THREE", "Third desc"), ("RULE FOUR", "Fourth desc")]
    path = _make_pdf(tmp_path, entries, use_bold=False, use_colon=True)
    res = pdf_tools.extract_rules(path)
    names = [r["name"] for r in res["rules"]]
    assert names == ["RULE THREE", "RULE FOUR"]
