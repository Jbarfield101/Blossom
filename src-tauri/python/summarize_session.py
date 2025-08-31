"""Summarize a transcript session into a journal entry."""

from __future__ import annotations

import argparse
import json
import os
from typing import Callable, Iterable, List, Dict

import requests


Transcript = Dict[str, str]


def load_session(path: str, session_id: str) -> List[Transcript]:
    """Load transcript entries matching ``session_id`` from ``path``.

    ``path`` is expected to be a JSON Lines file where each line is a
    ``Transcript`` object. Unknown lines are ignored.
    """

    entries: List[Transcript] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if obj.get("session_id") == session_id:
                entries.append(obj)
    return entries


def _local_llm(prompt: str) -> str:
    """Send ``prompt`` to a local LLM and return its response."""

    url = os.environ.get("LOCAL_LLM_URL", "http://localhost:11434/api/generate")
    model = os.environ.get("LOCAL_LLM_MODEL", "llama2")
    try:
        resp = requests.post(
            url, json={"model": model, "prompt": prompt, "stream": False}, timeout=30
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


def summarize_session(
    entries: Iterable[Transcript], llm: Callable[[str], str] = _local_llm
) -> str:
    """Generate a markdown/HTML journal summary of ``entries`` using ``llm``."""

    transcript = "\n".join(f"{e['speaker_id']}: {e['text']}" for e in entries)
    prompt = (
        "Summarize the following conversation into a short first-person journal "
        "entry. Include key events and emotions.\n\n" + transcript
    )
    return llm(prompt)


def main() -> int:
    parser = argparse.ArgumentParser(description="Summarize a transcript session")
    parser.add_argument("jsonl", help="Path to transcripts JSONL file")
    parser.add_argument("session_id", help="Session ID to summarize")
    args = parser.parse_args()

    entries = load_session(args.jsonl, args.session_id)
    summary = summarize_session(entries)
    print(summary)
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
