"""Procedurally generate loopable ambience clips."""
from __future__ import annotations

from pathlib import Path
import wave

import numpy as np

SR = 44100
DURATION = 4  # seconds for each clip

OUT_DIR = Path(__file__).resolve().parent / "samples" / "ambience"


def _save(name: str, data: np.ndarray) -> Path:
    """Save a mono float array to a WAV file in OUT_DIR."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{name}.wav"
    # ensure in [-1, 1]
    data = np.clip(data, -1.0, 1.0)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((data * 32767).astype(np.int16).tobytes())
    return path


def _loop_fade(x: np.ndarray, fade_len: int = int(0.05 * SR)) -> np.ndarray:
    """Apply fade at both ends so the clip can loop cleanly."""
    fade = np.linspace(0.0, 1.0, fade_len, dtype=np.float32)
    x[:fade_len] *= fade
    x[-fade_len:] *= fade[::-1]
    return x


def generate_forest() -> Path:
    n = int(SR * DURATION)
    # base soft noise
    base = np.random.normal(0, 0.02, n).astype(np.float32)
    # random bird chirps
    for _ in range(5):
        chirp_len = int(0.1 * SR)
        start = np.random.randint(0, n - chirp_len)
        freq = np.random.uniform(1000, 3000)
        chirp_t = np.linspace(0, chirp_len / SR, chirp_len, False)
        chirp = 0.1 * np.sin(2 * np.pi * freq * chirp_t) * np.hanning(chirp_len)
        base[start:start + chirp_len] += chirp
    return _save("forest", _loop_fade(base))


def generate_ocean() -> Path:
    n = int(SR * DURATION)
    t = np.linspace(0, DURATION, n, False)
    # brown noise for waves
    brown = np.cumsum(np.random.normal(0, 0.005, n)).astype(np.float32)
    brown = brown / np.max(np.abs(brown))
    amp = 0.5 * (1 + np.sin(2 * np.pi * 0.2 * t)).astype(np.float32)
    return _save("ocean", _loop_fade(brown * amp * 0.3))


def generate_train() -> Path:
    n = int(SR * DURATION)
    t = np.linspace(0, DURATION, n, False)
    rumble = np.cumsum(np.random.normal(0, 0.004, n)).astype(np.float32)
    rumble = rumble / np.max(np.abs(rumble)) * 0.2
    chuff = (np.sin(2 * np.pi * 3 * t) > 0).astype(np.float32)
    chuff *= np.sin(2 * np.pi * 40 * t) * 0.2
    return _save("train", _loop_fade(rumble + chuff))


GENERATORS = {
    "forest": generate_forest,
    "ocean": generate_ocean,
    "train": generate_train,
}


def generate_all() -> None:
    """Generate all ambience clips."""
    for gen in GENERATORS.values():
        gen()
