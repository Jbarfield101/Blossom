import argparse
import hashlib
import json
import os
import sqlite3
from pathlib import Path
import uuid
import re
import asyncio

import numpy as np
import pdfplumber
import pytesseract
import requests
import subprocess


def _base_dir() -> Path:
    env_dir = os.environ.get("BLOSSOM_OUTPUT_DIR")
    if env_dir:
        return Path(env_dir)
    settings_file = Path.home() / ".blossom_settings.json"
    if settings_file.exists():
        try:
            data = json.loads(settings_file.read_text())
            out = data.get("output_folder")
            if out:
                return Path(out)
        except Exception:
            pass
    return Path(__file__).resolve().parents[2] / "Knowledge"


BASE_DIR = _base_dir()
PDF_DIR = BASE_DIR / "PDFs"
INDEX_DIR = BASE_DIR / "Index"
EMBED_DIM = 512

# repository roots for D&D assets
ROOT_DIR = Path(__file__).resolve().parents[2]
DND_DIR = ROOT_DIR / "dnd"
NPC_SPEC_DIR = ROOT_DIR / "npc" / "specs"
QUEST_DIR = DND_DIR / "quests"
TSX_BIN = ROOT_DIR / "node_modules" / ".bin" / ("tsx.cmd" if os.name == "nt" else "tsx")


def ensure_dirs() -> None:
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    INDEX_DIR.mkdir(parents=True, exist_ok=True)


def file_hash(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def extract_pages(pdf_path: Path, doc_dir: Path):
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        meta = pdf.metadata or {}
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            if len(text.strip()) < 10:
                try:
                    image = page.to_image(resolution=300).original
                    text = pytesseract.image_to_string(image)
                except Exception:
                    text = ""
            (doc_dir / "pages").mkdir(exist_ok=True)
            (doc_dir / "pages" / f"{i}.txt").write_text(text, encoding="utf-8")
            pages.append(text)
        doc_info = {
            "title": meta.get("Title") or pdf_path.stem,
            "author": meta.get("Author"),
            "created": meta.get("CreationDate"),
            "pages": len(pdf.pages),
            "hash": file_hash(pdf_path),
        }
        (doc_dir / "doc.json").write_text(json.dumps(doc_info, indent=2), encoding="utf-8")
    return pages, doc_info


def chunk_text(pages, doc_id, chunk_size: int = 500):
    chunks = []
    current = ""
    start_page = 1
    for i, text in enumerate(pages, start=1):
        words = text.split()
        for w in words:
            if len(current.split()) >= chunk_size:
                chunks.append({"doc_id": doc_id, "page_range": [start_page, i], "text": current})
                current = ""
                start_page = i
            current += (" " + w) if current else w
    if current:
        chunks.append({"doc_id": doc_id, "page_range": [start_page, len(pages)], "text": current})
    return chunks


def hash_embed(text: str, dim: int = EMBED_DIM):
    """Create a simple bag-of-words embedding with stable token hashing.

    Tokens are lowercased and hashed using SHA-256 so that the mapping
    from tokens to vector indices is deterministic across Python sessions.
    The digest is interpreted as a big-endian integer and reduced modulo
    ``dim`` to select the bucket for each token. This ensures embeddings
    persist across runs of the application.
    """
    vec = np.zeros(dim, dtype=np.float32)
    for token in text.lower().split():
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        idx = int.from_bytes(digest, "big") % dim
        vec[idx] += 1.0
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec


def get_db():
    conn = sqlite3.connect(INDEX_DIR / "index.sqlite")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS embeddings (
            chunk_id TEXT PRIMARY KEY,
            embedding BLOB,
            doc_id TEXT,
            page_start INTEGER,
            page_end INTEGER,
            text TEXT
        )
        """
    )
    return conn


def add_pdf(path: str):
    ensure_dirs()
    pdf_path = Path(path)
    doc_hash = file_hash(pdf_path)
    doc_id = doc_hash[:16]
    doc_dir = INDEX_DIR / doc_id
    if doc_dir.exists():
        info = json.loads((doc_dir / "doc.json").read_text())
        return {"doc_id": doc_id, "pages": info.get("pages", 0)}

    doc_dir.mkdir(parents=True, exist_ok=True)
    pages, _ = extract_pages(pdf_path, doc_dir)
    chunks = chunk_text(pages, doc_id)

    with (INDEX_DIR / "chunks.jsonl").open("a", encoding="utf-8") as f:
        for idx, ch in enumerate(chunks):
            chunk_id = f"{doc_id}_{idx}"
            ch["chunk_id"] = chunk_id
            f.write(json.dumps(ch) + "\n")

    conn = get_db()
    for idx, ch in enumerate(chunks):
        chunk_id = f"{doc_id}_{idx}"
        emb = hash_embed(ch["text"]).tobytes()
        ps, pe = ch["page_range"]
        conn.execute(
            "INSERT OR REPLACE INTO embeddings VALUES (?,?,?,?,?,?)",
            (chunk_id, emb, doc_id, ps, pe, ch["text"]),
        )
    conn.commit()
    return {"doc_id": doc_id, "pages": len(pages)}


def remove_doc(doc_id: str):
    doc_dir = INDEX_DIR / doc_id
    if doc_dir.exists():
        for p in doc_dir.rglob("*"):
            if p.is_file():
                p.unlink()
        for p in sorted(doc_dir.glob("**/*"), reverse=True):
            if p.is_dir():
                p.rmdir()
    if (INDEX_DIR / "chunks.jsonl").exists():
        lines = []
        with (INDEX_DIR / "chunks.jsonl").open("r", encoding="utf-8") as f:
            for line in f:
                obj = json.loads(line)
                if obj["doc_id"] != doc_id:
                    lines.append(line)
        with (INDEX_DIR / "chunks.jsonl").open("w", encoding="utf-8") as f:
            f.writelines(lines)
    conn = get_db()
    conn.execute("DELETE FROM embeddings WHERE doc_id=?", (doc_id,))
    conn.commit()


def reindex():
    ensure_dirs()
    added = 0
    updated = 0
    for pdf in PDF_DIR.glob("*.pdf"):
        doc_hash = file_hash(pdf)
        doc_id = doc_hash[:16]
        doc_dir = INDEX_DIR / doc_id
        if not doc_dir.exists():
            add_pdf(pdf)
            added += 1
        else:
            info = json.loads((doc_dir / "doc.json").read_text())
            if info.get("hash") != doc_hash:
                remove_doc(doc_id)
                add_pdf(pdf)
                updated += 1
    return {"added": added, "updated": updated}


def extract_spells(path: str):
    """Extract simple spell entries from a PDF file and tag via LLM."""
    pdf_path = Path(path)
    spells: list[dict] = []
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    for block in text.split("\n\n"):
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        if not lines:
            continue
        name = lines[0]
        desc = " ".join(lines[1:])
        spells.append({"name": name, "description": desc})

    async def _tag_spell(spell: dict) -> dict:
        prompt = (
            "Extract tags (school, level, etc.) and optional sections from this D&D spell. "
            "Respond with JSON {\"tags\": [...], \"sections\": {section: text}}."
        )
        text = f"Name: {spell['name']}\n{spell['description']}"
        try:
            raw = await asyncio.wait_for(
                asyncio.to_thread(_llm_extract, text, prompt), timeout=15
            )
            if raw:
                data = json.loads(raw)
                tags = data.get("tags") or []
                sections = data.get("sections") or {}
                if isinstance(tags, list):
                    spell["tags"] = tags
                if isinstance(sections, dict) and sections:
                    spell["sections"] = {k: sections[k] for k in sorted(sections)}
        except Exception:
            pass
        return spell
    try:
        async def _run_all():
            return await asyncio.gather(*(_tag_spell(s) for s in spells))
        try:
            spells = asyncio.run(_run_all())
        except RuntimeError:
            loop = asyncio.new_event_loop()
            try:
                spells = loop.run_until_complete(_run_all())
            finally:
                loop.close()
    except Exception:
        pass
    return {"spells": spells}


def extract_lore(path: str):
    pdf_path = Path(path)
    lore_list = []
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    for block in text.split("\n\n"):
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        if not lines:
            continue
        data = {}
        for line in lines:
            if ":" in line:
                k, v = line.split(":", 1)
                data[k.strip().lower()] = v.strip()
        if not data:
            continue
        hooks_raw = (
            data.get("hooks")
            or data.get("adventure hooks")
            or data.get("adventure_hooks")
            or ""
        )
        lore = {
            "id": str(uuid.uuid4()),
            "name": data.get("name", "Unknown"),
            "summary": data.get("summary", ""),
            "location": data.get("location"),
            "hooks": [h.strip() for h in hooks_raw.split(",") if h.strip()] or None,
            "tags": [t.strip() for t in data.get("tags", "lore").split(",") if t.strip()],
        }
        sections = {
            k: v
            for k, v in data.items()
            if k
            not in {
                "name",
                "summary",
                "location",
                "hooks",
                "adventure hooks",
                "adventure_hooks",
                "tags",
            }
        }
        if sections:
            lore["sections"] = sections
        lore_list.append(lore)
    return {"lore": lore_list}


def extract_rules(path: str):
    """Extract rule entries from a PDF file using layout heuristics and tag via LLM."""
    pdf_path = Path(path)
    rules: list[dict] = []

    def _group_lines(words):
        """Group extracted words into lines based on their vertical positions."""
        lines = []
        current = []
        last_top = None
        for w in words:
            top = w.get("top")
            if last_top is None or abs(top - last_top) <= 2:
                current.append(w)
            else:
                lines.append(current)
                current = [w]
            last_top = top
        if current:
            lines.append(current)
        return lines

    with pdfplumber.open(pdf_path) as pdf:
        current = None
        for page in pdf.pages:
            words = page.extract_words(extra_attrs=["fontname", "size"]) or []
            if words:
                lines = _group_lines(words)
                for line_words in lines:
                    text = " ".join(w["text"] for w in line_words).strip()
                    if not text:
                        continue
                    fonts = [w.get("fontname", "").lower() for w in line_words]
                    is_heading = any("bold" in f for f in fonts) or text.isupper() or text.endswith(":")
                    if is_heading:
                        if current:
                            rules.append(current)
                        current = {"name": text.rstrip(":"), "description": ""}
                    elif current:
                        if current["description"]:
                            current["description"] += " "
                        current["description"] += text
            else:
                # Fallback to text extraction when word data is unavailable
                for line in (page.extract_text() or "").splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    if line.isupper() or line.endswith(":"):
                        if current:
                            rules.append(current)
                        current = {"name": line.rstrip(":"), "description": ""}
                    elif current:
                        if current["description"]:
                            current["description"] += " "
                        current["description"] += line
        if current:
            rules.append(current)

    # If heuristics produced nothing, fall back to simple paragraph splitting
    if not rules:
        with pdfplumber.open(pdf_path) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        for block in text.split("\n\n"):
            lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
            if not lines:
                continue
            name = lines[0]
            desc = " ".join(lines[1:])
            rules.append({"name": name, "description": desc})

    async def _tag_rule(rule: dict) -> dict:
        prompt = (
            "Extract descriptive tags and optional sections for this game rule. "
            "Respond with JSON {\"tags\": [...], \"sections\": {section: text}}."
        )
        text = f"Name: {rule['name']}\n{rule['description']}"
        try:
            raw = await asyncio.wait_for(
                asyncio.to_thread(_llm_extract, text, prompt), timeout=15
            )
            if raw:
                data = json.loads(raw)
                tags = data.get("tags") or []
                sections = data.get("sections") or {}
                if isinstance(tags, list):
                    rule["tags"] = tags
                if isinstance(sections, dict) and sections:
                    rule["sections"] = {k: sections[k] for k in sorted(sections)}
        except Exception:
            pass
        return rule
    try:
        async def _run_all():
            return await asyncio.gather(*(_tag_rule(r) for r in rules))
        try:
            rules = asyncio.run(_run_all())
        except RuntimeError:
            loop = asyncio.new_event_loop()
            try:
                rules = loop.run_until_complete(_run_all())
            finally:
                loop.close()
    except Exception:
        pass

    return {"rules": rules}


def search(query: str, k: int = 3):
    ensure_dirs()
    conn = get_db()
    qvec = hash_embed(query)

    def _score(blob: bytes) -> float:
        emb = np.frombuffer(blob, dtype=np.float32)
        return float(np.dot(qvec, emb))

    conn.create_function("cosine_sim", 1, _score)
    cursor = conn.execute(
        """
        SELECT chunk_id, doc_id, page_start, page_end, text,
               cosine_sim(embedding) AS score
        FROM embeddings
        ORDER BY score DESC
        LIMIT ?
        """,
        (k,),
    )
    results = []
    for row in cursor:
        results.append(
            {
                "doc_id": row[1],
                "page_range": [row[2], row[3]],
                "text": row[4],
                "score": row[5],
            }
        )
    return {"results": results}


def list_docs():
    ensure_dirs()
    docs = []
    if INDEX_DIR.exists():
        for doc_dir in INDEX_DIR.iterdir():
            if doc_dir.is_dir():
                info_path = doc_dir / "doc.json"
                if info_path.exists():
                    info = json.loads(info_path.read_text())
                    docs.append(
                        {
                            "doc_id": doc_dir.name,
                            "title": info.get("title"),
                            "pages": info.get("pages"),
                            "created": info.get("created"),
                        }
                    )
    return {"documents": docs}

def meta(doc_id: str):
    doc_dir = INDEX_DIR / doc_id
    info = json.loads((doc_dir / "doc.json").read_text())
    return {"title": info.get("title"), "pages": info.get("pages"), "created": info.get("created")}


# ---------------- Ingestion helpers -----------------

def _llm_extract(text: str, prompt: str | None = None) -> str:
    """Send text to a local LLM and return raw string response."""
    url = os.environ.get("LOCAL_LLM_URL", "http://localhost:11434/api/generate")
    model = os.environ.get("LOCAL_LLM_MODEL", "llama2")
    if prompt is None:
        prompt = (
            "Extract Dungeons & Dragons entities (npc, lore, quest) from the following text. "
            "Respond with a JSON array of objects {\"type\": \"npc|lore|quest\", \"data\": {...}}.\n\n"
        ) + text
    else:
        prompt = prompt + "\n\n" + text
    try:
        resp = requests.post(
            url,
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=30,
        )
        if resp.ok:
            data = resp.json()
            if isinstance(data, dict):
                if "response" in data:
                    return data["response"]
                if "choices" in data and data["choices"]:
                    return data["choices"][0].get("text", "")
    except Exception:
        pass
    return ""


def _validate_entry(kind: str, payload: dict) -> bool:
    """Validate payload using zod schemas via a node script."""
    script = ROOT_DIR / "scripts" / "validate-dnd.ts"
    if not TSX_BIN.exists():
        return False
    try:
        subprocess.run(
            [str(TSX_BIN), str(script), kind, json.dumps(payload)],
            capture_output=True,
            text=True,
            check=True,
        )
        return True
    except (subprocess.SubprocessError, OSError):
        return False


def _save_entry(kind: str, payload: dict) -> None:
    if kind == "lore":
        out_dir = DND_DIR / "lore"
    elif kind == "npc":
        out_dir = NPC_SPEC_DIR
    elif kind == "quest":
        out_dir = QUEST_DIR
    else:
        return
    out_dir.mkdir(parents=True, exist_ok=True)
    entry_id = payload.get("id") or hashlib.sha256(json.dumps(payload).encode()).hexdigest()[:8]
    (out_dir / f"{entry_id}.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )


def _run_reindex() -> None:
    script = ROOT_DIR / "scripts" / "reindex.ts"
    if not TSX_BIN.exists():
        return
    try:
        subprocess.run([str(TSX_BIN), str(script)], check=False)
    except OSError:
        pass


def ingest_doc(doc_id: str):
    """Process a document's chunks through the local LLM and persist results."""
    chunks_path = INDEX_DIR / "chunks.jsonl"
    if not chunks_path.exists():
        return {"processed": 0, "saved": 0}
    texts = []
    with chunks_path.open("r", encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            if obj.get("doc_id") == doc_id:
                texts.append(obj.get("text", ""))
    processed = 0
    saved = 0
    for text in texts:
        processed += 1
        raw = _llm_extract(text)
        if not raw:
            continue
        try:
            items = json.loads(raw)
        except Exception:
            continue
        if isinstance(items, dict):
            items = [items]
        for item in items:
            kind = item.get("type")
            payload = item.get("data")
            if not isinstance(payload, dict) or not kind:
                continue
            if _validate_entry(kind, payload):
                _save_entry(kind, payload)
                saved += 1
    if saved:
        _run_reindex()
    return {"processed": processed, "saved": saved}


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("add")
    p.add_argument("path")
    sub.add_parser("reindex")
    p = sub.add_parser("search")
    p.add_argument("query")
    p.add_argument("-k", type=int, default=3)
    p = sub.add_parser("meta")
    p.add_argument("doc_id")
    p = sub.add_parser("remove")
    p.add_argument("doc_id")
    p = sub.add_parser("ingest")
    p.add_argument("doc_id")
    sub.add_parser("list")
    p = sub.add_parser("spells")
    p.add_argument("path")
    p = sub.add_parser("rules")
    p.add_argument("path")
    p = sub.add_parser("lore")
    p.add_argument("path")
    args = parser.parse_args()

    if args.cmd == "add":
        out = add_pdf(args.path)
    elif args.cmd == "reindex":
        out = reindex()
    elif args.cmd == "search":
        out = search(args.query, args.k)
    elif args.cmd == "meta":
        out = meta(args.doc_id)
    elif args.cmd == "remove":
        remove_doc(args.doc_id)
        out = {"removed": args.doc_id}
    elif args.cmd == "ingest":
        out = ingest_doc(args.doc_id)
    elif args.cmd == "list":
        out = list_docs()
    elif args.cmd == "spells":
        out = extract_spells(args.path)
    elif args.cmd == "rules":
        out = extract_rules(args.path)
    elif args.cmd == "lore":
        out = extract_lore(args.path)
    else:
        out = {}
    json.dump(out, fp=os.fdopen(1, "w"))


if __name__ == "__main__":
    main()
