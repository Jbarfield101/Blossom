import json
from pathlib import Path

from summarize_session import load_session, summarize_session


def test_summarize_session(tmp_path):
    jsonl = tmp_path / "transcripts.jsonl"
    data = [
        {"session_id": "s1", "speaker_id": "A", "start": 0, "end": 1, "text": "Hello"},
        {"session_id": "s1", "speaker_id": "B", "start": 1, "end": 2, "text": "Hi"},
        {"session_id": "s2", "speaker_id": "C", "start": 0, "end": 1, "text": "Other"},
    ]
    with open(jsonl, "w", encoding="utf-8") as f:
        for obj in data:
            f.write(json.dumps(obj) + "\n")

    entries = load_session(str(jsonl), "s1")

    def fake_llm(prompt: str) -> str:
        assert "A: Hello" in prompt
        assert "B: Hi" in prompt
        assert "C: Other" not in prompt
        return "<p>summary</p>"

    summary = summarize_session(entries, llm=fake_llm)
    assert summary == "<p>summary</p>"
