#!/usr/bin/env python3
"""
Blossom MusicGen CLI shim.

This script now uses MusicGenEngine (library class) to produce actual audio
as a NumPy array, writes a WAV file, and streams JSONL progress + legacy lines.

Usage:
  python src-tauri/python/musicgen_engine.py text <prompt> <seconds>
  python src-tauri/python/musicgen_engine.py melody <prompt> <melodyPath> <seconds>
"""

import json
import os
import sys
import time
import threading
from typing import Tuple

import numpy as np

try:
    import soundfile as sf  # type: ignore
except Exception:  # pragma: no cover
    sf = None  # type: ignore

from musicgen_engine_lib import MusicGenEngine


def eprint(event: str, **kw):
    msg = {"event": event, **kw}
    print(json.dumps(msg), flush=True)


def sanitize_filename(name: str) -> str:
    safe = []
    for ch in name:
        if ch.isalnum() or ch in ("-", "_", ".", " "):
            safe.append(ch)
        else:
            safe.append("_")
    return "".join(safe).strip() or "track"


def out_dir() -> str:
    cwd = os.getcwd()
    candidate = os.path.join(cwd, "src-tauri", "target", "debug", "musicgen")
    try:
        os.makedirs(candidate, exist_ok=True)
        return candidate
    except Exception:
        import tempfile

        d = os.path.join(tempfile.gettempdir(), "blossom", "musicgen")
        os.makedirs(d, exist_ok=True)
        return d


def parse_args(argv) -> Tuple[str, str, str, int]:
    if len(argv) < 3:
        raise SystemExit("usage: musicgen_engine.py <text|melody> <prompt> [melodyPath] <seconds>")

    mode = argv[1]
    if mode not in ("text", "melody"):
        raise SystemExit("mode must be 'text' or 'melody'")
    prompt = argv[2]
    melody = ""
    if mode == "melody":
        if len(argv) < 5:
            raise SystemExit("melody mode requires: prompt melodyPath seconds")
        melody = argv[3]
        seconds = int(float(argv[4]))
    else:
        seconds = int(float(argv[3]))
    return mode, prompt, melody, seconds


def main():
    try:
        mode, prompt, melody, seconds = parse_args(sys.argv)
    except SystemExit as exc:
        eprint("error", message=str(exc))
        print(str(exc), file=sys.stderr)
        sys.exit(2)

    sr = int(os.environ.get("MUSICGEN_SR", "44100"))
    engine = MusicGenEngine(sample_rate=sr)

    # Run generation in a worker thread; stream simulated progress meanwhile
    done = threading.Event()
    result = {"audio": None}  # type: ignore
    err = {"msg": None}

    def worker():
        try:
            if mode == "melody" and melody:
                y = engine.generate(prompt=prompt, seconds=seconds, melody=melody)
            else:
                y = engine.generate(prompt=prompt, seconds=seconds)
            result["audio"] = y
        except Exception as exc:  # pragma: no cover (surface as error event)
            err["msg"] = str(exc)
        finally:
            done.set()

    threading.Thread(target=worker, daemon=True).start()

    p = 0
    while not done.is_set():
        eprint("progress", value=p)
        print(f"{p}%", flush=True)
        p = min(95, p + 5)
        time.sleep(0.2)

    if err["msg"] is not None:
        eprint("error", message=err["msg"]) 
        print(f"ERROR {err['msg']}", file=sys.stderr)
        sys.exit(1)

    # Finish progress
    eprint("progress", value=100)
    print("100%", flush=True)

    # Write WAV
    y = result["audio"]
    if not isinstance(y, np.ndarray):
        eprint("error", message="internal error: audio not generated")
        print("ERROR internal: no audio", file=sys.stderr)
        sys.exit(1)

    base = sanitize_filename(prompt.split(".")[0][:24])
    filename = f"{int(time.time())}_{base or 'track'}.wav"
    path = os.path.abspath(os.path.join(out_dir(), filename))

    try:
        if sf is None:
            raise RuntimeError("soundfile not available")
        sf.write(path, y, sr)
    except Exception as exc:
        eprint("error", message=f"failed to write wav: {exc}")
        print(f"ERROR {exc}", file=sys.stderr)
        sys.exit(1)

    # Emit final path
    eprint("file", path=path)
    print(f"FILE {path}")


if __name__ == "__main__":
    main()
