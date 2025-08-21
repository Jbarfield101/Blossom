"""Low-level DSP helpers for lofi rendering."""

from typing import List

import numpy as np

from effects import SR, _butter_lowpass, _butter_highpass, _apply_duck_envelope


def _env_ad(decay_ms: float, length_ms: int):
    n = max(1, int(length_ms * SR / 1000))
    d = int(decay_ms * SR / 1000)
    d = max(0, min(d, n))
    env = np.ones(n, dtype=np.float32)
    if d > 0:
        tail = np.linspace(1.0, 0.0, d, dtype=np.float32)
        env[-d:] *= tail
    return env

def _sine(freq, ms, amp=0.5):
    t = np.arange(int(ms * SR / 1000)) / SR
    return (amp * np.sin(2 * np.pi * freq * t)).astype(np.float32)

def _pitch_sweep(f0, f1, ms, amp=0.8):
    n = int(ms * SR / 1000)
    t = np.arange(n) / SR
    freqs = np.linspace(f0, f1, n)
    phase = 2 * np.pi * np.cumsum(freqs) / SR
    return (amp * np.sin(phase)).astype(np.float32)

def _noise(ms, amp=0.3, rng=None):
    n = int(ms * SR / 1000)
    if rng is not None:
        r = (rng.random(n).astype(np.float32) * 2 - 1)
    else:
        r = (np.random.rand(n).astype(np.float32) * 2 - 1)
    return (amp * r).astype(np.float32)


def _kick(ms=160, rng=None):
    body = _pitch_sweep(90, 45, ms, amp=0.9) * _env_ad(ms*0.9, ms)
    click = _noise(40, 0.2, rng=rng) * _env_ad(20, 40)
    x = body.copy(); x[:len(click)] += click
    x = _butter_lowpass(x, 150)
    return x

def _snare(ms=180, rng=None):
    tone = _sine(180, ms, 0.05) * _env_ad(120, ms)
    noise = _noise(ms, 0.5, rng=rng) * _env_ad(140, ms)
    x = noise + tone
    x = _butter_highpass(x, 180)
    return x

def _hat(ms=60, rng=None):
    n = _noise(ms, 0.4, rng=rng)
    n = _butter_highpass(n, 5000)
    n *= _env_ad(40, ms)
    return n

def _process_drums(x: np.ndarray) -> np.ndarray:
    """Basic lofi treatment for drum bus."""
    y = _butter_lowpass(x, 8000)
    max_val = 2 ** 7 - 1
    y = np.round(y * max_val) / max_val
    y = np.tanh(y * 1.8)
    return y.astype(np.float32)

def _process_hats(x: np.ndarray, snare_positions_ms: List[float], variety: int) -> np.ndarray:
    y = _butter_lowpass(x, 10000)
    depth = 1.0
    if variety > 70:
        depth = 0.7
    _apply_duck_envelope(y, snare_positions_ms, depth_db=depth, attack_ms=5, hold_ms=20, release_ms=60)
    if variety > 70:
        y *= 10 ** (-0.8 / 20.0)
    return y.astype(np.float32)

def _bar_ms(bpm):
    return int((60.0 / bpm) * 4 * 1000)

def _beats_ms(bpm):
    beat = int((60.0 / bpm) * 1000)
    eighth = beat // 2
    sixteenth = beat // 4
    return beat, eighth, sixteenth

# Stereo and mix polish helpers reside in effects.py

def _vinyl_crackle(n: int, density=0.0015, ticky=0.003, rng=None) -> np.ndarray:
    if rng is None:
        x = (np.random.rand(n).astype(np.float32)*2 - 1) * 0.0007  # hiss
        pops = (np.random.rand(n) < density).astype(np.float32)
        if pops.any():
            x[pops > 0] += (np.random.rand(int(pops.sum())).astype(np.float32)*2-1) * ticky
    else:
        x = (rng.random(n).astype(np.float32)*2 - 1) * 0.0007  # hiss
        pops = (rng.random(n) < density).astype(np.float32)
        if pops.any():
            x[pops > 0] += (rng.random(int(pops.sum())).astype(np.float32)*2-1) * ticky
    return _butter_lowpass(x, 6000)

def _analog_noise_floor(n: int, level=0.0003, rng=None) -> np.ndarray:
    if rng is not None:
        noise = rng.standard_normal(n).astype(np.float32) * level
    else:
        noise = np.random.randn(n).astype(np.float32) * level
    return _butter_highpass(noise, 200)

