"""Generate images from action-heavy transcript scenes."""
from __future__ import annotations

import argparse
import os
import re
from pathlib import Path
from typing import Iterable, List

import requests

# Keywords for simple action detection
ACTION_REGEX = re.compile(
    r"\b(" +
    r"|".join([
        "attack",
        "attacks",
        "attacked",
        "battle",
        "battles",
        "charge",
        "charges",
        "charged",
        "clash",
        "clashes",
        "clashed",
        "crash",
        "crashes",
        "crashed",
        "explosion",
        "explodes",
        "exploded",
        "fight",
        "fights",
        "fighting",
        "fires",
        "fire",
        "fired",
        "jump",
        "jumps",
        "jumped",
        "kick",
        "kicks",
        "kicked",
        "punch",
        "punches",
        "punched",
        "run",
        "runs",
        "running",
        "slash",
        "slashes",
        "storm",
        "storms",
        "stormed",
        "strike",
        "strikes",
        "struck",
    ]) +
    r")\b",
    re.IGNORECASE,
)

COMFY_API_URL = os.environ.get("COMFY_API_URL", "http://127.0.0.1:8188")
LOCAL_LLM_URL = os.environ.get("LOCAL_LLM_URL", "http://localhost:11434/api/generate")
LOCAL_LLM_MODEL = os.environ.get("LOCAL_LLM_MODEL", "llama2")


def extract_action_scenes(transcript: str) -> List[str]:
    """Return sentences containing action keywords."""
    sentences = re.split(r"(?<=[.!?])\s+", transcript)
    return [s.strip() for s in sentences if ACTION_REGEX.search(s)]


def _llm_refine(scene: str) -> str:
    """Refine a raw scene description into an image prompt via local LLM."""
    prompt = (
        "Rewrite the following action scene into a concise image generation prompt "
        "with vivid imagery and specific details. Respond with the prompt only.\n\n"
        + scene
    )
    try:
        resp = requests.post(
            LOCAL_LLM_URL,
            json={"model": LOCAL_LLM_MODEL, "prompt": prompt, "stream": False},
            timeout=30,
        )
        if resp.ok:
            data = resp.json()
            if isinstance(data, dict):
                if "response" in data:
                    return data["response"].strip()
                choices = data.get("choices")
                if choices:
                    return choices[0].get("text", "").strip()
    except Exception:
        pass
    return ""


def generate_image(prompt: str, workflow: dict | None = None, api_url: str | None = None) -> bool:
    """Submit a prompt to the ComfyUI workflow and trigger image generation."""
    if api_url is None:
        api_url = COMFY_API_URL
    if workflow is None:
        return False
    for node in workflow.get("nodes", []):
        if node.get("type") == "CLIPTextEncode":
            widgets = node.get("widgets_values")
            if isinstance(widgets, list) and widgets:
                widgets[0] = prompt
            break
    try:
        resp = requests.post(f"{api_url}/prompt", json={"prompt": workflow}, timeout=60)
        return resp.ok
    except Exception:
        return False


def process_transcript(transcript: str) -> List[str]:
    """Scan transcript, refine scenes into prompts, and generate images."""
    scenes = extract_action_scenes(transcript)
    prompts: List[str] = []
    for scene in scenes:
        prompt = _llm_refine(scene)
        if not prompt:
            continue
        prompts.append(prompt)
        generate_image(prompt)
    return prompts


def main(argv: Iterable[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Generate images from transcript scenes")
    parser.add_argument("path", help="Path to transcript text file")
    args = parser.parse_args(argv)
    text = Path(args.path).read_text(encoding="utf-8")
    prompts = process_transcript(text)
    for p in prompts:
        print(p)


if __name__ == "__main__":
    main()
