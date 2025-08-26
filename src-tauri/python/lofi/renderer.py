# renderer.py (Blossom HQ)
# High-quality renderer with optional polish features
# Same CLI / JSON spec / output behavior as before
# Adds high‑quality polish while keeping determinism by seed.
#
# ✅ Includes previous hardening & musical fixes:
#   - Safe parsing of variety / key "Auto"
#   - Per‑chord bass (tracks progression)
#   - -16 LUFS target, darker LPF
#   - Hat micro‑duck on snare
#   - Ambience defaults gentler (0.5) and low‑passed
#   - Chord velocity drift, hat wow
#   - Mix rebalance
#
# 🆕 HQ patches:
#   - Stereoize final mix (Haas + HF decorrelation)
#   - Sidechain‑style ducking of keys/bass under kick
#   - Small room reverb sends (hats/snare + light keys)
#   - Optional vinyl crackle when mood includes "nostalgic"
#   - Master tone tilt (subtle low warmth + soft high trim)
#   - Subtle chorus on keys/pads/melody
#   - Tape saturation and wow/flutter for analog warmth
#   - Feature flags: hq_stereo / hq_reverb / hq_sidechain / hq_chorus (default True)
#   - Mood-aware mix & ambience levels
#   - Optional lofi piano instrument

import argparse
import json
import os
import random
import hashlib
import re
import logging
from typing import List, Dict, Tuple, Any, Optional
from pathlib import Path

import numpy as np
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError
import soundfile as sf

from lofi.dsp import (
    SR,
    _butter_lowpass,
    _butter_highpass,
    _butter_bandpass,
    apply_soft_limit,
    apply_tape_saturation,
    apply_wow_flutter,
    stereoize_np,
    apply_chorus_np,
    _apply_duck_envelope,
    _schroeder_room,
)
from lofi.io_utils import ensure_wav_bitdepth


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:  # type: ignore[override]
        if isinstance(record.msg, dict):
            payload = {"level": record.levelname, **record.msg}
        else:
            payload = {"level": record.levelname, "message": record.getMessage()}
        return json.dumps(payload)


_handler = logging.StreamHandler()
_handler.setFormatter(_JsonFormatter())
logging.basicConfig(level=logging.INFO, handlers=[_handler])
logger = logging.getLogger(__name__)


INSTRUMENTS_ENV = "BLOSSOM_INSTRUMENTS_FILE"
DEFAULT_INSTRUMENTS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "instruments.json"
)


def _load_instruments(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("Instruments JSON must be an object")
    alias = data.get("alias")
    canon = data.get("canonical")
    if not isinstance(alias, dict) or not all(
        isinstance(k, str) and isinstance(v, str) for k, v in alias.items()
    ):
        raise ValueError("'alias' must be a dict of strings")
    if not isinstance(canon, list) or not all(isinstance(x, str) for x in canon):
        raise ValueError("'canonical' must be a list of strings")
    return {"alias": alias, "canonical": canon}


def _resolve_instruments_path() -> str:
    env_path = os.environ.get(INSTRUMENTS_ENV)
    if env_path and os.path.exists(env_path):
        return env_path
    if os.path.exists(DEFAULT_INSTRUMENTS_PATH):
        return DEFAULT_INSTRUMENTS_PATH
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "src-tauri" / "python" / "data" / "instruments.json"
        if candidate.exists():
            return str(candidate)
    raise FileNotFoundError(
        f"Could not locate instruments.json. Set {INSTRUMENTS_ENV} to its path."
    )


INSTRUMENTS_DATA = _load_instruments(_resolve_instruments_path())


# ---------- Small helpers ----------
def _stable_hash_int(s: str) -> int:
    return int.from_bytes(hashlib.md5(s.encode("utf-8")).digest()[:4], "little")

def bars_to_ms(bars: int, bpm: float, beats_per_bar: int = 4) -> int:
    seconds_per_beat = 60.0 / float(bpm)
    seconds = bars * beats_per_bar * seconds_per_beat
    return int(seconds * 1000)

def crossfade_concat(sections: List[AudioSegment], ms: int = 120) -> AudioSegment:
    if not sections:
        return AudioSegment.silent(duration=1)
    out = sections[0]
    for seg in sections[1:]:
        out = out.append(seg, crossfade=ms)
    return out


def _normalize_instruments(instrs):
    alias = INSTRUMENTS_DATA["alias"]
    canon = INSTRUMENTS_DATA["canonical"]
    out = []
    for s in (instrs or []):
        k = str(s).strip().lower()
        k = alias.get(k, k)
        matched = False
        for name in canon:
            if name in k:
                out.append(name)
                matched = True
                break
        if not matched:
            out.append(k)
    return out

# ---------- Post-processing ----------

def loudness_normalize_lufs(audio: AudioSegment, target_lufs: float = -14.0) -> AudioSegment:
    samples = np.array(audio.get_array_of_samples()).astype(np.float32)
    if audio.channels == 2:
        samples = samples.reshape((-1, 2)).mean(axis=1)
    max_int = float(2 ** (8 * audio.sample_width - 1))
    x = samples / max_int
    headroom = 0.0
    try:
        import pyloudnorm as pyln

        meter = pyln.Meter(audio.frame_rate)
        loudness = meter.integrated_loudness(x)
    except ImportError:
        abs_x = np.abs(x)
        gate = abs_x > 10 ** (-60.0 / 20.0)
        if not np.any(gate):
            return audio
        rms = np.sqrt(np.mean(np.square(x[gate])))
        if rms <= 0:
            return audio
        loudness = 20 * np.log10(rms)
        headroom = 3.0
        logger.warning(
            {
                "stage": "warn",
                "message": "pyloudnorm missing, using gated RMS loudness estimate with 3 dB headroom",
            }
        )
    except Exception as e:
        logger.warning({"stage": "warn", "message": f"loudness normalization failed: {e}"})
        return audio
    gain_needed = target_lufs - loudness - headroom
    return audio.apply_gain(gain_needed)

def enhanced_post_process_chain(
    audio: AudioSegment,
    rng=None,
    drive: float = 1.02,
    dither_amount: float = 1.0,
    wow_flutter: Optional[Dict[str, float]] = None,
) -> AudioSegment:
    """Darker, warmer finishing chain for lofi character.

    dither_amount controls final triangular dithering level (1.0 = 1 LSB).
    """
    a = audio.high_pass_filter(30)

    lpf_base = 7800
    if rng is not None:
        lpf_base = int(rng.integers(7000, 8500))
    a = a.low_pass_filter(lpf_base + 500)
    a = a.low_pass_filter(lpf_base)

    mids = a.low_pass_filter(2000).high_pass_filter(200).apply_gain(1.5)
    a = a.overlay(mids)
    presence = a.high_pass_filter(4000).apply_gain(-2.0)
    a = a.overlay(presence)

    drv = drive
    if drive is None and rng is not None:
        drv = float(rng.uniform(0.98, 1.04))
    if wow_flutter:
        a = apply_wow_flutter(a, **wow_flutter)
    else:
        a = apply_wow_flutter(a, rng=rng)
    a = apply_tape_saturation(a, drive=drv)
    a = apply_soft_limit(a, drive=drv)

    try:
        arr = np.array(a.get_array_of_samples()).astype(np.float32)
        if a.channels == 2:
            arr = arr.reshape((-1, 2)).mean(axis=1)
        max_int = float(2 ** (8 * a.sample_width - 1))
        mono = arr / max_int
        low = _butter_lowpass(mono, 140) * 0.06
        high_cut = _butter_lowpass(mono, 11500)
        shaped = np.clip(high_cut + low, -1.0, 1.0)
        a = a.overlay(_np_to_segment(shaped, frame_rate=a.frame_rate))
    except Exception:
        pass

    a = loudness_normalize_lufs(a, target_lufs=-16.0)
    a = ensure_wav_bitdepth(
        a, sample_width=2, dither_amount=dither_amount, rng=rng
    )
    return a

# ---------- DSP building blocks ----------
def _np_to_segment(x: np.ndarray, frame_rate=SR) -> AudioSegment:
    """Accepts mono (N,) or stereo (N,2) float32 in [-1,1]."""
    if x.ndim == 1:
        x = np.stack([x, x], axis=-1)
    x = np.clip(x, -1.0, 1.0)
    xi16 = (x * 32767.0).astype(np.int16)
    interleaved = xi16.reshape(-1)
    return AudioSegment(
        interleaved.tobytes(),
        frame_rate=frame_rate,
        sample_width=2,
        channels=2,
    )

def _env_ad(decay_ms: float, length_ms: int):
    n = max(1, int(length_ms * SR / 1000))
    d = int(decay_ms * SR / 1000)
    d = max(0, min(d, n))
    env = np.ones(n, dtype=np.float32)
    if d > 0:
        tail = np.linspace(1.0, 0.0, d, dtype=np.float32)
        env[-d:] *= tail
    return env


class SfzSampler:
    """Very small SFZ sampler supporting <region> with basic opcodes."""

    def __init__(self, regions):
        self.regions = regions

    @staticmethod
    def _load_region(opcodes, base_dir):
        sample_file = opcodes.get("sample")
        if not sample_file:
            return None
        sample_path = base_dir / sample_file
        data, sr = sf.read(sample_path, dtype="float32")
        if data.ndim > 1:
            data = data.mean(axis=1)
        return {
            "sample": data.astype(np.float32),
            "sr": int(sr),
            "lokey": int(opcodes.get("lokey", 0)),
            "hikey": int(opcodes.get("hikey", 127)),
            "pitch_keycenter": int(opcodes.get("pitch_keycenter", 60)),
        }

    @classmethod
    def from_file(cls, path):
        path = Path(path)
        base = path.parent
        regions = []
        current = {}
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("//"):
                    continue
                if line.startswith("<region>"):
                    if current:
                        r = cls._load_region(current, base)
                        if r:
                            regions.append(r)
                        current = {}
                else:
                    if "=" in line:
                        k, v = line.split("=", 1)
                        current[k.strip()] = v.strip()
        if current:
            r = cls._load_region(current, base)
            if r:
                regions.append(r)
        return cls(regions)

    def render(self, freq_hz, ms):
        midi = 69 + 12 * np.log2(freq_hz / 440.0)
        region = next((r for r in self.regions if r["lokey"] <= midi <= r["hikey"]), self.regions[0])
        data = region["sample"]
        sr = region["sr"]
        if sr != SR:
            data = np.interp(
                np.linspace(0, len(data), int(len(data) * SR / sr), endpoint=False),
                np.arange(len(data)),
                data,
            ).astype(np.float32)
            sr = SR
        semitones = midi - region["pitch_keycenter"]
        ratio = 2 ** (semitones / 12)
        if ratio != 1.0:
            n_out = max(1, int(len(data) / ratio))
            data = np.interp(
                np.linspace(0, len(data), n_out, endpoint=False),
                np.arange(len(data)),
                data,
            ).astype(np.float32)
        n = int(ms * SR / 1000)
        out = data[:n]
        if len(out) < n:
            pad = np.zeros(n, dtype=np.float32)
            pad[: len(out)] = out
            out = pad
        out *= _env_ad(ms * 0.8, ms)
        return out


def _resolve_sfz_path(p: str) -> Path:
    path = Path(p)
    if path.is_absolute() and path.exists():
        return path
    root = Path(__file__).resolve().parents[3]
    rel = Path(str(path).lstrip("/\\"))
    candidate = root / rel
    if candidate.exists():
        return candidate
    alt = root / "public" / rel
    return alt

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

def _load_ambience_sample(name: str, n: int, rng=None) -> Optional[np.ndarray]:
    """Load and loop an ambience sample from samples/ambience."""
    amb_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "samples", "ambience")
    files = []
    if os.path.isdir(amb_dir):
        files = [f for f in os.listdir(amb_dir) if name.lower() in f.lower()]
    if not files:
        try:
            import importlib.util

            gen_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ambience_generator.py")
            spec = importlib.util.spec_from_file_location("ambience_generator", gen_path)
            ag = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(ag)
            generators = getattr(ag, "GENERATORS", {})
            gen = generators.get(name)
            if gen is not None:
                gen()
            else:
                ag.generate_all()
            if os.path.isdir(amb_dir):
                files = [f for f in os.listdir(amb_dir) if name.lower() in f.lower()]
        except Exception as exc:
            logger.warning(
                {
                    "stage": "warn",
                    "message": f"failed to generate ambience '{name}'",
                    "error": str(exc),
                }
            )
    if not files:
        logger.warning(
            {
                "stage": "warn",
                "message": f"no ambience sample for '{name}'",
            }
        )
        return None
    choice = rng.choice(files) if rng is not None else random.choice(files)
    path = os.path.join(amb_dir, choice)
    try:
        seg = AudioSegment.from_file(path)
        seg = seg.set_frame_rate(SR).set_channels(1)
        arr = np.array(seg.get_array_of_samples()).astype(np.float32)
        max_int = float(2 ** (8 * seg.sample_width - 1))
    except (FileNotFoundError, CouldntDecodeError) as exc:
        logger.warning(
            {
                "stage": "warn",
                "message": f"failed to load ambience '{name}'",
                "error": str(exc),
            }
        )
        return None
    arr = arr / max_int
    fade_len = int(0.05 * SR)
    needed = n + fade_len
    if len(arr) < needed:
        reps = int(np.ceil(needed / len(arr)))
        arr = np.tile(arr, reps)
    arr = arr[:needed]

    fade_out = np.linspace(1.0, 0.0, fade_len, dtype=np.float32)
    fade_in = np.linspace(0.0, 1.0, fade_len, dtype=np.float32)
    arr[-fade_len:] *= fade_out
    arr[:fade_len] *= fade_in
    arr[:fade_len] += arr[-fade_len:]
    arr = arr[:n]

    arr = _butter_highpass(arr, 200)
    arr = _butter_lowpass(arr, 5000)
    return arr * 0.002

# ---------- Harmony helpers ----------
SEMITONES = {"C":0,"C#":1,"Db":1,"D":2,"D#":3,"Eb":3,"E":4,"F":5,"F#":6,"Gb":6,"G":7,"G#":8,"Ab":8,"A":9,"A#":10,"Bb":10,"B":11}

def _degree_to_root_semi(deg: str, mode: str = "major") -> int:
    """Convert a Roman-numeral degree into a semitone offset."""
    accidental = 0
    core = deg
    if core.startswith("b"):
        accidental = -1
        core = core[1:]
    elif core.startswith("#"):
        accidental = 1
        core = core[1:]

    minor_map = {"i":0,"ii":2,"iii":3,"iv":5,"v":7,"vi":8,"vii":10,
                 "III":3,"VI":8,"VII":10}
    major_map = {"I":0,"II":2,"III":4,"IV":5,"V":7,"VI":9,"VII":11}

    if mode == "minor":
        base = minor_map.get(core.lower(), 0)
    else:
        if core in minor_map and not deg.startswith(("b", "#")):
            base = minor_map[core]
        else:
            base = major_map.get(core.upper(), 0)
    return (base + accidental) % 12

def _chord_freqs_from_degree(key_letter: str, deg: str, add7=False, add9=False, inversion=0, mode="major"):
    match = re.match(r'^([b#]?)([ivIV]+)(.*)$', deg)
    if match:
        accidental, core, suffix = match.groups()
        deg_core = f"{accidental}{core}"
    else:
        deg_core, suffix = deg, ""
        core = deg.lstrip("b#")
    suffix_l = suffix.lower()

    key_off = SEMITONES.get(key_letter, 0)
    root_c = _degree_to_root_semi(deg_core, mode)
    root_midi = 48 + ((root_c + key_off) % 12)

    if mode == "minor":
        minor_degs = {"i", "iv", "v", "ii", "vii"}
        quality = "min" if core.lower() in minor_degs or core.islower() else "maj"
    else:
        minor_degs = {"ii", "iii", "vi"}
        quality = "min" if core.lower() in minor_degs or core.islower() else "maj"

    if "sus2" in suffix_l:
        notes = [root_midi, root_midi + 2, root_midi + 7]
    elif "sus4" in suffix_l or "sus" in suffix_l:
        notes = [root_midi, root_midi + 5, root_midi + 7]
    else:
        third = 3 if quality == "min" else 4
        notes = [root_midi, root_midi + third, root_midi + 7]

    if "maj9" in suffix_l:
        notes.append(root_midi + 11)
        notes.append(root_midi + 14)
    elif "min9" in suffix_l:
        notes.append(root_midi + 10)
        notes.append(root_midi + 14)
    else:
        if "maj7" in suffix_l:
            notes.append(root_midi + 11)
        elif "min7" in suffix_l:
            notes.append(root_midi + 10)
        elif "dom7" in suffix_l or ("7" in suffix_l and "maj7" not in suffix_l and "min7" not in suffix_l):
            notes.append(root_midi + 10)
        elif add7:
            notes.append(root_midi + (11 if quality == "maj" else 10))

        if "add9" in suffix_l:
            notes.append(root_midi + 14)
        elif add9:
            notes.append(root_midi + 14)

    for _ in range(inversion):
        notes[0] += 12
        notes.sort()

    return [440.0 * (2 ** ((m - 69) / 12.0)) for m in notes]

def _lofi_rhodes_chord(freqs, ms, amp=0.12, rng=None):
    env = _env_ad(ms*0.85, ms)
    t = np.arange(int(ms * SR / 1000)) / SR
    out = np.zeros_like(t, dtype=np.float32)
    wow = 1.0 + 0.003*np.sin(2*np.pi*0.5*t) + 0.002*np.sin(2*np.pi*3*t)
    for f in freqs:
        if rng is not None:
            det_jit = (rng.random() - 0.5)
        else:
            det_jit = (np.random.rand() - 0.5)
        det = f * (1.0 + 0.01*det_jit)
        out += 0.7*np.sin(2*np.pi*det*t*wow) + 0.3*np.sin(2*np.pi*(det*2)*t*wow)
    out *= env * amp / max(1, len(freqs))
    out = _butter_lowpass(out, 4000)
    return out

def _nylon_chord(freqs, ms, amp=0.1):
    env = _env_ad(ms*0.6, ms)
    t = np.arange(int(ms * SR / 1000)) / SR
    out = np.zeros_like(t, dtype=np.float32)
    for f in freqs:
        out += np.sin(2*np.pi*f*t)
    out *= env * amp / max(1, len(freqs))
    return out

def _acoustic_chord(freqs, ms, amp=0.1):
    env = _env_ad(ms*0.7, ms)
    t = np.arange(int(ms * SR / 1000)) / SR
    out = np.zeros_like(t, dtype=np.float32)
    for f in freqs:
        out += np.sin(2*np.pi*f*t)
    out = _butter_highpass(out, 500)
    out = _butter_lowpass(out, 5000)
    out *= env * amp / max(1, len(freqs))
    return out

def _electric_piano_chord(freqs, ms, amp=0.1):
    env = _env_ad(ms*0.8, ms)
    t = np.arange(int(ms * SR / 1000)) / SR
    out = np.zeros_like(t, dtype=np.float32)
    for f in freqs:
        out += 0.6*np.sin(2*np.pi*f*t) + 0.4*np.sin(2*np.pi*(f*2)*t)
    out *= env * amp / max(1, len(freqs))
    out = _butter_lowpass(out, 5000)
    return out

def _lofi_piano_chord(freqs, ms, amp=0.12):
    env = _env_ad(ms*0.85, ms)
    t = np.arange(int(ms * SR / 1000)) / SR
    out = np.zeros_like(t, dtype=np.float32)
    for f in freqs:
        out += 0.6*np.sin(2*np.pi*f*t) + 0.4*np.sin(2*np.pi*(f*2)*t)
    out *= env * amp / max(1, len(freqs))
    out = _butter_lowpass(out, 4500)
    return out

def _clean_guitar_chord(freqs, ms, amp=0.08):
    env = _env_ad(ms*0.7, ms)
    t = np.arange(int(ms * SR / 1000)) / SR
    out = np.zeros_like(t, dtype=np.float32)
    for f in freqs:
        out += np.sin(2*np.pi*f*t)
    out = _butter_highpass(out, 300) * env * amp / max(1, len(freqs))
    return out

def _airy_pad_chord(freqs, ms, amp=0.06):
    env = _env_ad(ms, ms)
    t = np.arange(int(ms * SR / 1000)) / SR
    out = np.zeros_like(t, dtype=np.float32)
    for f in freqs:
        out += np.sin(2*np.pi*f*t) + 0.5*np.sin(2*np.pi*(f/2)*t)
    out *= env * amp / max(1, len(freqs))
    out = _butter_lowpass(out, 2000)
    return out

def _bass_note(freq, ms, amp=0.18):
    x = _sine(freq, ms, amp=amp)
    x = _butter_lowpass(x, 200)
    x *= _env_ad(ms*0.7, ms)
    return x

# ---------- Variation controls ----------
DRUM_PATTERNS = {
    "boom_bap_A":  {"kick": [(0,0.00), (2,0.50)], "snare":[(1,0.00), (3,0.00)], "hat_8ths": True},
    "boom_bap_B":  {"kick": [(0,0.00), (2,0.00)], "snare":[(1,0.00), (3,0.00)], "hat_8ths": True},
    "laidback":    {"kick": [(0,0.00), (2,0.75)], "snare":[(1,0.00), (3,0.00)], "hat_8ths": True},
    "half_time":   {"kick": [(0,0.00)],           "snare":[(2,0.00)],           "hat_8ths": True},
    "swing":       {"kick": [(0,0.00), (1,0.75), (2,0.00)], "snare":[(1,0.00), (3,0.00)], "hat_8ths": True},
    "half_time_shuffle": {"kick": [(0,0.00), (3,0.50)], "snare":[(2,0.00)], "hat_8ths": True},
    "bossa_nova":  {"kick": [(0,0.00), (1,0.50), (2,0.00), (3,0.50)], "snare":[(1,0.00), (3,0.00)], "hat_8ths": True},
    "no_drums":   {"kick": [], "snare": [], "hat_8ths": False},
}

PROG_BANK_A = [["I","vi","IV","V"], ["I","V","vi","IV"], ["I","iii","vi","IV"], ["I","vi","ii","V"], ["I","IV","ii","V"],
                ["I","IV","V","IV"], ["I","ii","V","IV"], ["I","V","IV","V"],
                ["I","bVII","IV","I"], ["I","IV","bVII","I"],
                ["i","bVII","bVI","bVII"], ["i","iv","bVII","i"], ["i","VI","III","VII"]]
PROG_BANK_B = [["vi","IV","I","V"], ["ii","V","I","vi"], ["IV","I","V","vi"], ["vi","ii","V","I"], ["IV","vi","ii","V"],
                ["vi","IV","ii","V"], ["ii","vi","IV","I"], ["vi","V","IV","V"],
                ["i","iv","i","v"], ["i","VI","III","VII"], ["i","bVII","bVI","bVII"], ["I","bIII","IV","I"], ["vi","bVII","I","V"]]
PROG_BANK_C = [["ii","V","iii","vi"], ["vi","IV","I","V"], ["iii","vi","ii","V"], ["IV","I","ii","vi"], ["i","iv","bVII","III"]]
PROG_BANK_INTRO = [["I","IV"], ["ii","V"], ["I","V"], ["vi","IV"], ["I","ii"], ["I","vi"], ["IV","V"], ["ii","iii"],
                   ["i","iv"], ["i","bVII"], ["i","VI"], ["I","bVII"], ["I","bIII"]]

def _stitch_progression(bank, rng, length=None):
    """Generate a progression using a simple Markov chain over the bank."""
    rng = rng or np.random.default_rng()
    if length is None:
        length = len(rng.choice(bank))

    starts = [p[0] for p in bank if p]
    trans = {}
    for prog in bank:
        for a, b in zip(prog, prog[1:]):
            trans.setdefault(a, []).append(b)

    seq = [rng.choice(starts)]
    while len(seq) < length:
        prev = seq[-1]
        choices = list(trans.get(prev, starts))

        remaining = length - len(seq)
        if remaining == 1:
            # Bias final chord toward the tonic
            tonic = "i" if any(chord.islower() for chord in seq) else "I"
            choices += [tonic] * 3
        elif remaining == 2:
            # Bias penultimate chord toward cadential movement
            choices += ["V", "V", "bVII", "IV"]

        seq.append(rng.choice(choices))

    # Ensure the phrase resolves on the tonic
    tonic = "i" if any(chord.islower() for chord in seq) else "I"
    if seq[-1] != tonic:
        seq[-1] = tonic

    return seq

BASS_PATTERNS = ["roots_13", "root5_13", "held_whole"]

# ---------- Placement helpers ----------
def _place(sample, dest, pos_ms, amp=1.0):
    i0 = int(max(0, pos_ms) * SR / 1000)
    i1 = min(len(dest), i0 + len(sample))
    if i1 > i0:
        dest[i0:i1] += (sample[:i1 - i0] * amp)

def _jitter_ms(rng, std_ms=6.0):
    return float(rng.normal(0.0, std_ms))

def _vel_scale(rng, mean=1.0, std=0.08, lo=0.8, hi=1.2):
    v = rng.normal(mean, std)
    return float(np.clip(v, lo, hi))

def _swing_offset(eighth_ms, sub_idx, swing=0.58):
    if sub_idx % 2 == 1:
        long = swing * 2.0 * eighth_ms - eighth_ms
        return long - eighth_ms
    return 0.0


def calculate_mix_levels(mood, section_name):
    """Calculate context-aware mix levels"""
    levels = {
        "drum_gain": 0.28,
        "hat_gain": 0.18,
        "key_gain": 0.9,
        "bass_gain": 0.38,
        "pad_gain": 0.6,
        "melody_gain": 0.8,
    }

    if "calm" in mood or "chill" in mood:
        levels["drum_gain"] *= 0.7
        levels["key_gain"] *= 1.1
        levels["pad_gain"] *= 1.1
        levels["melody_gain"] *= 1.05
    if "energetic" in mood:
        levels["drum_gain"] *= 1.2
        levels["pad_gain"] *= 0.9
        levels["melody_gain"] *= 1.1
    if "melancholy" in mood:
        levels["key_gain"] *= 1.15
        levels["pad_gain"] *= 1.2
        levels["melody_gain"] *= 1.1

    if section_name.lower() in ["intro", "outro"]:
        levels["drum_gain"] *= 0.8
        levels["key_gain"] *= 0.9
        levels["pad_gain"] *= 0.95
        levels["melody_gain"] *= 0.9

    if section_name.lower() in ["ambient", "break"]:
        levels["pad_gain"] *= 1.15
        levels["melody_gain"] *= 1.15

    return levels


def auto_balance_levels(busses: Dict[str, np.ndarray], levels: Dict[str, float]) -> Dict[str, float]:
    """Auto-balance mix levels by analyzing RMS of each bus.

    Parameters
    ----------
    busses: dict
        Mapping of bus name (e.g. ``"drum"``) to its audio buffer.
    levels: dict
        Initial gain levels keyed like ``"<name>_gain"``.
    """
    rms_vals = {}
    for name, buf in busses.items():
        if buf is None or len(buf) == 0:
            continue
        rms_vals[name] = float(np.sqrt(np.mean(np.square(buf))))
    if not rms_vals:
        return levels

    reference = float(np.median(list(rms_vals.values())))
    balanced = levels.copy()
    for name, rms in rms_vals.items():
        key = f"{name}_gain"
        if key not in balanced or rms <= 0:
            continue
        adj = reference / rms
        adj = float(np.clip(adj, 0.5, 2.0))
        balanced[key] *= adj
    return balanced


def _render_melody(
    prog_seq,
    key_letter,
    key_mode,
    bpm,
    dur_ms,
    rng,
    chord_span_beats=4,
    section_name="",
    motif_store=None,
    sampler: Optional[SfzSampler] = None,
):
    """Lead line with 2-bar motif and minimum note density."""

    def _mel_note(freq, ms):
        if sampler is not None:
            return sampler.render(freq, ms)
        x = _sine(freq, ms, amp=0.22)
        x *= _env_ad(ms * 0.8, ms)
        x = _butter_lowpass(x, 4000)
        return x

    beat, eighth, sixteenth = _beats_ms(bpm)
    bar_ms = _bar_ms(bpm)
    chord_len = chord_span_beats * beat
    n = int(dur_ms * SR / 1000)
    out = np.zeros(n, dtype=np.float32)

    bars_total = int(np.ceil(dur_ms / bar_ms))

    # Pre-compute chord choices per bar
    bar_choices = []
    for bar in range(bars_total):
        chord_idx = int((bar * bar_ms) // chord_len)
        deg = prog_seq[chord_idx % len(prog_seq)]
        freqs = _chord_freqs_from_degree(key_letter, deg, add7=False, add9=False, mode=key_mode)
        bar_choices.append([f * 2 for f in freqs])

    if motif_store is None:
        motif_store = {}

    motif_key = "melody_motif"
    motif_events = motif_store.get(motif_key)

    # Create motif on first A section
    if (section_name.lower().startswith("a") or section_name.lower().startswith("verse")) and motif_events is None:
        motif_events = []
        for bar in range(min(2, bars_total)):
            choices = bar_choices[bar]
            subs = list(range(8))
            rng.shuffle(subs)
            selected = subs[:2]
            for sub in subs[2:]:
                if rng.random() < 0.5:
                    selected.append(sub)
            selected.sort()
            for sub in selected:
                pos = bar * bar_ms + sub * eighth
                freq = float(rng.choice(choices))
                dur = int(rng.choice([eighth, sixteenth * 3, beat]))
                motif_events.append((pos, freq, dur))
        motif_store[motif_key] = motif_events

    variation_prob = rng.uniform(0.1, 0.2)

    if motif_events:
        repeats = int(np.ceil(bars_total / 2))
        for rep in range(repeats):
            offset = rep * 2 * bar_ms
            for base_pos, base_freq, base_dur in motif_events:
                start = base_pos + offset
                if start >= dur_ms:
                    continue
                freq = base_freq
                pos = start
                if rep > 0 and rng.random() < variation_prob:
                    choice = int(rng.integers(0, 3))
                    if choice == 0:  # octave flip
                        freq = base_freq * (2 if rng.random() < 0.5 else 0.5)
                    elif choice == 1:  # note swap
                        bar_idx = int(pos // bar_ms)
                        opts = bar_choices[bar_idx % len(bar_choices)]
                        freq = float(rng.choice(opts))
                    else:  # rhythm shift
                        pos += _jitter_ms(rng, sixteenth * 0.5)
                        if pos < 0:
                            pos = 0
                note = _mel_note(freq, base_dur)
                note *= _vel_scale(rng, mean=1.0, std=0.05, lo=0.8, hi=1.2)
                _place(note, out, pos + _jitter_ms(rng, 4.0))
    else:
        # Fallback: random notes but ensure >=2 per bar
        for bar in range(bars_total):
            choices = bar_choices[bar]
            subs = list(range(8))
            rng.shuffle(subs)
            selected = subs[:2]
            for sub in subs[2:]:
                if rng.random() < 0.5:
                    selected.append(sub)
            selected.sort()
            for sub in selected:
                pos = bar * bar_ms + sub * eighth
                freq = float(rng.choice(choices))
                dur = int(rng.choice([eighth, sixteenth * 3, beat]))
                note = _mel_note(freq, dur)
                note *= _vel_scale(rng, mean=1.0, std=0.05, lo=0.8, hi=1.2)
                _place(note, out, pos + _jitter_ms(rng, 4.0))

    return out

def _apply_melody_timbre(x, instrs):
    if "violin" in instrs:
        return _butter_lowpass(x, 6000)
    if "cello" in instrs:
        return _butter_lowpass(x, 2000)
    if "flute" in instrs:
        return _butter_highpass(_butter_lowpass(x, 8000), 1000)
    if "saxophone" in instrs:
        return _butter_bandpass(x, 300, 5000)
    if "clarinet" in instrs:
        return _butter_bandpass(x, 200, 5000)
    if "muted trumpet" in instrs:
        return _butter_bandpass(x, 400, 6000)
    if "trumpet" in instrs:
        return _butter_bandpass(x, 500, 7000)
    if "french horn" in instrs:
        # Allow a wider upper band so high notes don't get filtered out
        return _butter_bandpass(x, 200, 5000)
    if "harp" in instrs or "lute" in instrs:
        return _butter_highpass(_butter_lowpass(x, 7000), 400)
    if "pan flute" in instrs:
        return _butter_highpass(_butter_lowpass(x, 6000), 800)
    if "synth lead" in instrs:
        return _butter_highpass(_butter_lowpass(x, 10000), 500)
    if "vibraphone" in instrs:
        return _butter_lowpass(x, 6500)
    if "celesta" in instrs:
        return _butter_highpass(_butter_lowpass(x, 7000), 1500)
    if "muted electric guitar" in instrs:
        return _butter_bandpass(x, 300, 3500)
    if "synth plucks" in instrs:
        return _butter_highpass(_butter_lowpass(x, 8000), 1200)
    return x

# ---------- Section renderer ----------
def _render_section(bars, bpm, section_name, motif, rng, variety=60, chords=None, chord_span_beats=4):
    # Variety mapping (0..100)
    t = float(np.clip(variety, 0, 100)) / 100.0
    swing = 0.54 + 0.08*t
    jitter_std = 2.0 + 10.0*t
    ghost_prob = 0.2 + 0.6*t
    fill_prob = 0.15 + 0.35*t
    hat_prob = 0.95 - 0.2*t
    add7_prob = 0.3 + 0.5*t
    add9_prob = 0.1 + 0.35*t

    sn = section_name.lower()
    is_intro_outro = sn in ["intro", "outro"]
    is_break_ambient = sn in ["break", "ambient"]
    if is_intro_outro:
        ghost_prob *= 0.5
        fill_prob *= 0.5
        hat_prob *= 0.5
        chord_span_beats *= 2
    if is_break_ambient:
        ghost_prob *= 0.5
        fill_prob *= 0.5
        hat_prob *= 0.5
        chord_span_beats = 8

    dur_ms = bars_to_ms(bars, bpm)
    beat, eighth, sixteenth = _beats_ms(bpm)

    chord_len = chord_span_beats * beat

    n = int(dur_ms * SR / 1000)
    drums = np.zeros(n, dtype=np.float32)
    bass  = np.zeros(n, dtype=np.float32)
    keys  = np.zeros(n, dtype=np.float32)
    pads  = np.zeros(n, dtype=np.float32)
    hats  = np.zeros(n, dtype=np.float32)

    # --- choose drum pattern
    if is_break_ambient:
        pat_name = "no_drums"
    else:
        pat_name = motif.get("drum_pattern") or rng.choice(list(DRUM_PATTERNS.keys()))
    pat = DRUM_PATTERNS[pat_name]

    # subtle timing wow for hats (per section)
    wow_rate = rng.uniform(0.15, 0.35)
    wow_depth = rng.uniform(0.003, 0.006)

    kick_positions_ms: List[float] = []
    snare_positions_ms: List[float] = []

    # --- drums & hats
    for bar in range(bars):
        bar_start = bar * _bar_ms(bpm)

        # kicks
        for beat_idx, frac in pat["kick"]:
            pos = bar_start + beat_idx * beat + frac * beat
            pos += _swing_offset(eighth, int(frac*8) % 8, swing)
            pos += _jitter_ms(rng, jitter_std)
            k = _kick(int(rng.uniform(140, 180)), rng=rng) * _vel_scale(rng, mean=1.0)
            _place(k, drums, pos)
            kick_positions_ms.append(pos)

        # snares
        for beat_idx, frac in pat["snare"]:
            pos = bar_start + beat_idx * beat + frac * beat + _jitter_ms(rng, jitter_std)
            s = _snare(int(rng.uniform(160, 190)), rng=rng) * _vel_scale(rng, mean=1.0)
            _place(s, drums, pos)
            snare_positions_ms.append(pos)
            # micro-duck hats around snare
            snare_center = pos
            dip_len = int(0.06 * 1000)
            i0 = int(max(0, snare_center - 15) * SR / 1000)
            i1 = min(len(hats), i0 + int(dip_len * SR / 1000))
            if i1 > i0:
                hats[i0:i1] *= 0.85

        # ghost notes
        if rng.random() < ghost_prob:
            pos = bar_start + beat * rng.choice([0.75, 1.75, 2.75, 3.75]) + _jitter_ms(rng, jitter_std)
            g = _snare(120, rng=rng) * 0.35 * _vel_scale(rng, mean=0.9)
            _place(g, drums, pos)

        # hats (8ths)
        if pat["hat_8ths"]:
            for sub in range(8):
                if rng.random() < hat_prob:
                    pos = bar_start + sub * eighth
                    pos += _swing_offset(eighth, sub, swing)
                    pos += _jitter_ms(rng, jitter_std*0.6)
                    phase = 2*np.pi*wow_rate*((bar_start + sub*eighth)/1000.0)
                    pos += wow_depth * eighth * np.sin(phase)
                    h = _hat(int(rng.uniform(45, 70)), rng=rng) * _vel_scale(rng, mean=0.95)
                    _place(h, hats, pos)

        # simple 1-bar fill at each 4 bars
        if (bar + 1) % 4 == 0 and rng.random() < fill_prob:
            last_fill_ms = None
            for sidx in range(8, 16):
                if rng.random() < 0.6:
                    pos = bar_start + beat*4 - (16 - sidx) * sixteenth
                    pos += _jitter_ms(rng, jitter_std*0.5)
                    r = _hat(40, rng=rng) * 0.8 if rng.random() < 0.7 else _snare(90, rng=rng) * 0.5
                    if last_fill_ms is not None and pos - last_fill_ms < 15:
                        r *= 0.85
                    _place(r, drums, pos)
                    last_fill_ms = pos

    drums = _process_drums(drums)
    hats = _process_hats(hats, snare_positions_ms, variety)

    # --- harmony: choose progression + voicing options
    key_letter_raw = motif.get("key")
    raw = str(key_letter_raw or "C").strip().replace("♭", "b").replace("♯", "#")
    token = raw.split()[0]
    key_letter = token[0].upper()
    if len(token) > 1 and token[1] in ("b", "#"):
        key_letter += token[1]
    key_mode = str(motif.get("mode", "major")).lower()

    if chords:
        prog_seq = [str(c) for c in chords]
    elif sn.startswith("a") or sn.startswith("verse"):
        prog_seq = _stitch_progression(PROG_BANK_A, rng)
    elif sn.startswith("b") or sn.startswith("chorus"):
        prog_seq = _stitch_progression(PROG_BANK_B, rng)
    elif sn.startswith("c") or sn in ("bridge", "solo"):
        prog_seq = _stitch_progression(PROG_BANK_C, rng)
    else:
        prog_seq = _stitch_progression(PROG_BANK_INTRO, rng)

    add7 = (rng.random() < add7_prob)
    add9 = (rng.random() < add9_prob)
    inv_cycle = int(rng.integers(0, 3))

    lead = motif.get("lead_instrument")
    if lead:
        lead = _normalize_instruments([lead])[0]

    instrs = _normalize_instruments(motif.get("instruments"))
    if not instrs and lead:
        instrs.append(lead)

    mood = motif.get("mood") or []
    if instrs and "fantasy" in mood:
        fantasy_instrs = _normalize_instruments(["harp", "lute", "pan flute"])
        for inst in fantasy_instrs:
            if inst not in instrs:
                instrs.append(inst)
    logger.debug({"stage": "debug", "section": section_name, "instruments": instrs})

    use_electric = ("electric piano" in instrs)
    use_clean_gtr = ("clean electric guitar" in instrs)
    use_airy_pad = ("airy pads" in instrs)
    use_wurli = ("wurlitzer" in instrs)

    chord_pos = 0
    melodic_sources = {
        "rhodes",
        "piano",
        "electric piano",
        "clean electric guitar",
        "nylon guitar",
        "airy pads",
        "harp",
        "lute",
        "pan flute",
        "vibraphone",
        "celesta",
        "glockenspiel",
        "muted electric guitar",
        "synth plucks",
        "wurlitzer",
        "oboe",
        "french horn",
    }
    if instrs:
        add_rhodes_default = not any(src in instrs for src in melodic_sources)
    else:
        add_rhodes_default = False

    chord_roots_hz: List[float] = []

    while chord_pos < dur_ms:
        deg = prog_seq[(chord_pos // chord_len) % len(prog_seq)]
        freqs = _chord_freqs_from_degree(key_letter, deg, add7=add7, add9=add9, inversion=inv_cycle, mode=key_mode)
        chord_roots_hz.append(freqs[0])
        vel = _vel_scale(rng, mean=1.0, std=0.05, lo=0.9, hi=1.1)

        if ("rhodes" in instrs or add_rhodes_default) and ("piano" not in instrs):
            chord = _lofi_rhodes_chord(freqs, min(chord_len, dur_ms - chord_pos), amp=0.12, rng=rng) * vel
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(chord))
            keys[i0:i1] += chord[: i1 - i0]
        if "nylon guitar" in instrs:
            nylon = _nylon_chord(freqs, min(chord_len, dur_ms - chord_pos), amp=0.1) * vel
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(nylon))
            keys[i0:i1] += nylon[: i1 - i0]
        if "acoustic guitar" in instrs:
            ac = _acoustic_chord(freqs, min(chord_len, dur_ms - chord_pos), amp=0.1) * vel
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(ac))
            keys[i0:i1] += ac[: i1 - i0]
        if use_electric:
            ep = _electric_piano_chord(freqs, min(chord_len, dur_ms - chord_pos), amp=0.18) * vel
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(ep))
            keys[i0:i1] += ep[: i1 - i0]
        if use_wurli:
            ep = _electric_piano_chord(freqs, min(chord_len, dur_ms - chord_pos), amp=0.16) * vel
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(ep))
            keys[i0:i1] += ep[: i1 - i0]
        if use_clean_gtr:
            gtr = _clean_guitar_chord(freqs, min(chord_len, dur_ms - chord_pos), amp=0.15) * vel
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(gtr))
            keys[i0:i1] += gtr[: i1 - i0]
        if "piano" in instrs:
            pn = _lofi_piano_chord(freqs, min(chord_len, dur_ms - chord_pos), amp=0.25) * vel
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(pn))
            keys[i0:i1] += pn[: i1 - i0]
        if use_airy_pad:
            airy = _airy_pad_chord(freqs, min(chord_len*2, dur_ms - chord_pos), amp=0.12) * vel
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(airy))
            pads[i0:i1] += airy[: i1 - i0]

        chord_pos += chord_len

    if "piano" in instrs:
        if "calm" in mood or "melancholy" in mood or variety <= 40:
            hp_freq = rng.uniform(800, 1000)
            mix_amt = rng.uniform(0.05, 0.08)
            keys = (1.0 - mix_amt) * keys + mix_amt * _butter_highpass(keys, hp_freq)
        else:
            keys = 0.9 * keys + 0.1 * _butter_highpass(keys, 1800)

    # --- bass patterns (per-chord roots)
    bass_pat = rng.choice(BASS_PATTERNS)
    use_bass = any(i in instrs for i in ["upright bass", "bass", "rhodes"])
    if not instrs:
        use_bass = False

    if use_bass:
        for chord_idx, root_hz in enumerate(chord_roots_hz):
            chord_start = chord_idx * chord_len
            if chord_start >= dur_ms:
                break
            start_bar = (chord_start // _bar_ms(bpm))
            end_bar   = ((min(chord_start + chord_len, dur_ms) - 1) // _bar_ms(bpm))
            for bar in range(int(start_bar), int(end_bar) + 1):
                bar_start = bar * _bar_ms(bpm)
                if bass_pat == "held_whole":
                    pos = bar_start
                    freq_root = root_hz
                    if rng.random() < 0.25:
                        freq_root *= 2  # octave pop
                    b = _bass_note(freq_root, int(beat * 3.8), amp=0.16) * _vel_scale(rng, mean=0.95)
                    if pos - sixteenth > 0:
                        step = rng.choice([-2, -1, 1, 2]) / 12.0
                        app_freq = root_hz * (2 ** step)
                        app = _bass_note(app_freq, int(beat * 0.45), amp=0.12) * _vel_scale(rng, mean=0.9)
                        _place(app, bass, pos - sixteenth)
                    _place(b, bass, pos + _jitter_ms(rng, jitter_std))
                else:
                    for beat_idx in [0, 2]:
                        pos = bar_start + beat_idx * beat + _jitter_ms(rng, jitter_std)
                        freq_root = root_hz
                        if beat_idx == 0 and rng.random() < 0.25:
                            freq_root *= 2  # octave pop on bar start
                        root = _bass_note(freq_root, int(beat * 0.9), amp=0.18) * _vel_scale(rng)
                        if pos - sixteenth > 0:
                            step = rng.choice([-2, -1, 1, 2]) / 12.0
                            app_freq = root_hz * (2 ** step)
                            app = _bass_note(app_freq, int(beat * 0.45), amp=0.12) * _vel_scale(rng, mean=0.9)
                            _place(app, bass, pos - sixteenth)
                        _place(root, bass, pos)
                        if bass_pat == "root5_13" and rng.random() < 0.7:
                            pos5 = pos + beat * 0.5 + _jitter_ms(rng, jitter_std * 0.7)
                            fifth = _bass_note(root_hz * 2 ** (7 / 12), int(beat * 0.45), amp=0.14) * _vel_scale(rng, mean=0.9)
                            _place(fifth, bass, pos5)

    melody_active = True
    if is_intro_outro and rng.random() < 0.5:
        melody_active = False
    if melody_active:
        sampler = motif.get("sfz_sampler")
        melody = _render_melody(
            prog_seq,
            key_letter,
            key_mode,
            bpm,
            dur_ms,
            rng,
            chord_span_beats,
            section_name=section_name,
            motif_store=motif,
            sampler=sampler,
        )
        if sampler is None:
            instrs_for_timbre = instrs + ([lead] if lead else [])
            melody = _apply_melody_timbre(melody, instrs_for_timbre)
    else:
        melody = np.zeros(n, dtype=np.float32)

    # --- ambience rotation
    amb_list = motif.get("ambience") or []
    if not amb_list:
        # Leave amb_list empty when no ambience is specified so that
        # no ambience is mixed into the render.
        amb_list = []

    amb_level = float(np.clip(motif.get("ambience_level", 0.5), 0.0, 1.0))

    amb_mix = np.zeros(n, dtype=np.float32)
    if "rain" in amb_list:
        r = ((rng.random(n).astype(np.float32)*2-1) if rng is not None else (np.random.rand(n).astype(np.float32)*2-1)) * 0.004
        r = _butter_lowpass(r, 1200)
        r = _butter_highpass(r, 200)
        amb_mix += r
    if "cafe" in amb_list:
        c = ((rng.random(n).astype(np.float32)*2-1) if rng is not None else (np.random.rand(n).astype(np.float32)*2-1)) * 0.0008
        c = _butter_lowpass(c, 3000)
        mid = _butter_bandpass(c, 1200, 1800)
        c -= mid * 0.15
        amb_mix += c
    if "vinyl" in amb_list:
        v = _load_ambience_sample("vinyl", n, rng=rng)
        if v is not None:
            amb_mix += v
    if "street" in amb_list:
        s = _load_ambience_sample("street", n, rng=rng)
        if s is not None:
            amb_mix += s
    if "birds" in amb_list:
        b = _load_ambience_sample("birds", n, rng=rng)
        if b is not None:
            amb_mix += b
    if "cicadas" in amb_list:
        ci = _load_ambience_sample("cicadas", n, rng=rng)
        if ci is not None:
            amb_mix += ci
    if "train" in amb_list:
        tr = _load_ambience_sample("train", n, rng=rng)
        if tr is not None:
            amb_mix += tr
    if "forest" in amb_list:
        if "cicadas" not in amb_list:
            ci = _load_ambience_sample("cicadas", n, rng=rng)
            if ci is not None:
                amb_mix += ci
        for name in ["crickets", "forest", "wind"]:
            f = _load_ambience_sample(name, n, rng=rng)
            if f is not None:
                amb_mix += f
    if "fireplace" in amb_list:
        fp = _load_ambience_sample("fireplace", n, rng=rng)
        if fp is not None:
            amb_mix += fp
    if "ocean" in amb_list:
        oc = _load_ambience_sample("ocean", n, rng=rng)
        if oc is not None:
            amb_mix += oc

    if "vinyl sounds" in instrs:
        amb_mix += 0.5 * _vinyl_crackle(n, density=0.0015, ticky=0.004, rng=rng)

    if "string squeaks" in instrs:
        sq = _load_ambience_sample("string_squeaks", n, rng=rng)
        if sq is not None:
            amb_mix += sq
    if "key clicks" in instrs:
        kc = _load_ambience_sample("key_clicks", n, rng=rng)
        if kc is not None:
            amb_mix += kc
    if "breath noise" in instrs:
        bn = _load_ambience_sample("breath_noise", n, rng=rng)
        if bn is not None:
            amb_mix += bn

    # mood-specific ambience tweaks
    if "nostalgic" in mood:
        amb_mix += 0.6 * _vinyl_crackle(n, density=0.0012, ticky=0.006, rng=rng)
        amb_mix += _analog_noise_floor(n, level=0.0003, rng=rng)
    if "fantasy" in mood:
        fa = _load_ambience_sample("forest", n, rng=rng)
        if fa is not None:
            amb_mix += fa

    # --- feature flags (can be passed via motif; default True)
    flags = {
        "hq_stereo": True,
        "hq_reverb": True,
        "hq_sidechain": True,
        "hq_chorus": True,
    }
    for k in list(flags.keys()):
        if k in motif:
            try:
                flags[k] = bool(motif.get(k))
            except Exception:
                pass
    # chorus on harmonic elements
    if flags.get("hq_chorus", True):
        keys = apply_chorus_np(keys, rng=rng)
        pads = apply_chorus_np(pads, rng=rng)
        melody = apply_chorus_np(melody, rng=rng)

    # light room reverb sends
    if flags.get("hq_reverb", True):
        drum_bus = drums + 0.6*hats
        keys_bus = keys * 0.5
        pads_bus = pads * 0.5
        melody_bus = melody * 0.5
        wet_drums = _schroeder_room(drum_bus, mix=0.10, pre_ms=10, decay=0.32)
        wet_keys  = _schroeder_room(keys_bus, mix=0.07, pre_ms=14, decay=0.28)
        wet_pads  = _schroeder_room(pads_bus, mix=0.07, pre_ms=14, decay=0.28)
        wet_mel   = _schroeder_room(melody_bus, mix=0.07, pre_ms=14, decay=0.28)
        drums = 0.9*drums + 0.25*wet_drums
        keys  = 0.95*keys + 0.18*wet_keys
        pads  = 0.95*pads + 0.18*wet_pads
        melody = 0.95*melody + 0.18*wet_mel
        if "fantasy" in mood:
            extra_wet = _schroeder_room(pads + melody, mix=0.15, pre_ms=20, decay=0.5)
            pads = 0.9*pads + 0.2*extra_wet
            melody = 0.9*melody + 0.2*extra_wet
            amb_mix = 0.9*amb_mix + 0.2*_schroeder_room(amb_mix, mix=0.1, pre_ms=25, decay=0.6)

    # sidechain ducking to kick (subtle)
    if flags.get("hq_sidechain", True):
        depth = 2.0
        bass_depth = 2.0
        if "energetic" in mood or variety >= 70:
            depth = 2.5
            bass_depth = 2.5
        elif "calm" in mood or "melancholy" in mood or variety <= 40:
            depth = 1.2
            bass_depth = 1.0
        if is_break_ambient:
            depth *= 0.5
            bass_depth *= 0.5
        _apply_duck_envelope(keys, kick_positions_ms, depth_db=depth)
        _apply_duck_envelope(pads,  kick_positions_ms, depth_db=depth)
        _apply_duck_envelope(melody, kick_positions_ms, depth_db=depth)
        _apply_duck_envelope(bass,  kick_positions_ms, depth_db=bass_depth)

    # final mix (mono bus)
    levels = calculate_mix_levels(mood, section_name)
    if "piano" in instrs:
        levels["key_gain"] *= 1.08

    busses = {
        "drum": drums,
        "hat": hats,
        "key": keys,
        "pad": pads,
        "melody": melody,
        "bass": bass,
    }
    levels = auto_balance_levels(busses, levels)

    drum_gain = levels["drum_gain"]
    hat_gain = levels["hat_gain"]
    key_gain = levels["key_gain"]
    pad_gain = levels["pad_gain"]
    bass_gain = levels["bass_gain"]
    melody_gain = levels["melody_gain"]
    amb_gain = 0.12 * amb_level
    mix_music = (
        drum_gain * drums
        + hat_gain * hats
        + key_gain * keys
        + pad_gain * pads
        + melody_gain * melody
        + bass_gain * bass
    )
    amb_component = amb_gain * amb_mix
    music_rms = float(np.sqrt(np.mean(np.square(mix_music))))
    amb_rms = float(np.sqrt(np.mean(np.square(amb_component))))
    if amb_rms > 0 and music_rms > 0:
        target = music_rms * 0.6
        amb_component *= float(np.clip(target / amb_rms, 0.0, 1.0))

    mix = mix_music + amb_component
    mix = mix.astype(np.float32)
    peak = float(np.max(np.abs(mix)))
    if peak > 1.0:
        mix *= 0.9 / peak

    # stereoize
    if flags.get("hq_stereo", True):
        stereo = stereoize_np(mix)
        return _np_to_segment(stereo)
    else:
        return _np_to_segment(mix)

# ---------- Public API ----------
def model_generate_audio(
    bars: int,
    bpm: int,
    seed: int,
    section: str,
    motif: Dict[str, Any],
    variety: int,
    chords: Optional[List[str]] = None,
    chord_span_beats: int = 4,
) -> AudioSegment:
    sec = _stable_hash_int(section)
    full_seed = (seed ^ sec) & 0xFFFFFFFF
    rng = np.random.default_rng(full_seed)
    return _render_section(
        bars,
        bpm,
        section,
        motif,
        rng=rng,
        variety=variety,
        chords=chords,
        chord_span_beats=chord_span_beats,
    )


def build_song(
    sections: List[Tuple[str, int, Optional[List[str]]]],
    bpm: int,
    seed: int,
    motif: Dict[str, Any],
    variety: int,
    chord_span_beats: int = 4,
) -> AudioSegment:
    parts: List[AudioSegment] = []
    for name, bars, chords in sections:
        part = model_generate_audio(
            bars=bars,
            bpm=bpm,
            seed=seed,
            section=name,
            motif=motif,
            variety=variety,
            chords=chords,
            chord_span_beats=chord_span_beats,
        )
        parts.append(part)
    _, eighth, _ = _beats_ms(bpm)
    xf_ms = max(80, min(int(0.33 * eighth), 220))
    song = crossfade_concat(parts, ms=xf_ms)
    return song

FORM_TEMPLATES: Dict[str, List[Dict[str, Any]]] = {
    "LoFiBasic": [
        {"name": "Intro", "bars": 4},
        {"name": "A", "bars": 16},
        {"name": "B", "bars": 16},
        {"name": "A", "bars": 8},
        {"name": "Outro", "bars": 8},
    ],
    "AABA32": [
        {"name": "Intro", "bars": 4},
        {"name": "A", "bars": 8},
        {"name": "A", "bars": 8},
        {"name": "B", "bars": 8},
        {"name": "A", "bars": 8},
        {"name": "Outro", "bars": 4},
    ],
    "ABABCB": [
        {"name": "Intro", "bars": 4},
        {"name": "A", "bars": 16},
        {"name": "B", "bars": 16},
        {"name": "A", "bars": 16},
        {"name": "B", "bars": 16},
        {"name": "C", "bars": 8},
        {"name": "B", "bars": 8},
        {"name": "Outro", "bars": 8},
    ],
    "ThroughABCDEF": [
        {"name": "Intro", "bars": 4},
        {"name": "A", "bars": 8},
        {"name": "B", "bars": 8},
        {"name": "C", "bars": 8},
        {"name": "D", "bars": 8},
        {"name": "E", "bars": 8},
        {"name": "F", "bars": 8},
        {"name": "Outro", "bars": 4},
    ],
    "ThroughOddABCDEF": [
        {"name": "Intro", "bars": 4},
        {"name": "A", "bars": 7},
        {"name": "B", "bars": 5},
        {"name": "C", "bars": 7},
        {"name": "D", "bars": 5},
        {"name": "E", "bars": 7},
        {"name": "F", "bars": 5},
        {"name": "Outro", "bars": 4},
    ],
}

def render_from_spec(spec: Dict[str, Any]) -> Tuple[AudioSegment, int]:
    """Build a song from a SongSpec dict and return the audio and BPM."""
    preset_name = spec.get("preset")
    if preset_name:
        try:
            preset_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "presets.json")
            with open(preset_path, "r", encoding="utf-8") as f:
                presets = json.load(f)
            preset = presets.get(preset_name)
            if preset:
                for k, v in preset.items():
                    spec.setdefault(k, v)
        except Exception:
            pass
    bpm = int(spec.get("bpm", 80))
    seed = int(spec.get("seed", 12345))

    try:
        v = spec.get("variety", 60)
        variety = 60 if v is None else int(v)
    except Exception:
        variety = 60

    structure = spec.get("structure")
    if not structure:
        form_name = spec.get("form", "LoFiBasic")
        structure = FORM_TEMPLATES.get(form_name, FORM_TEMPLATES["LoFiBasic"])
    sections = [
        (s["name"], int(s["bars"]), s.get("chords") or None)
        for s in structure
    ]

    key_val = spec.get("key")
    key_mode = "major"
    if key_val is None or (isinstance(key_val, str) and str(key_val).lower() == "auto"):
        rng_key = np.random.default_rng((seed ^ 0xA5A5A5A5) & 0xFFFFFFFF)
        key_letter = rng_key.choice(list("CDEFGAB"))
    else:
        if isinstance(key_val, dict):
            key_letter = str(key_val.get("key", "C"))
            key_mode = str(key_val.get("mode", "major")).lower()
        else:
            raw = str(key_val).strip().replace("♭", "b").replace("♯", "#")
            if raw.lower().endswith("m"):
                key_mode = "minor"
                key_letter = raw[:-1]
            else:
                key_letter = raw
    token = str(key_letter).strip()
    base = token[0].upper()
    if len(token) > 1 and token[1] in ("b", "#"):
        base += token[1]
    key_letter = base

    try:
        amb_lvl = float(spec.get("ambience_level", 0.5))
    except Exception:
        amb_lvl = 0.5

    try:
        limiter_drive = float(spec.get("limiter_drive", 1.02))
        limiter_drive = float(np.clip(limiter_drive, 0.5, 2.0))
    except Exception:
        limiter_drive = 1.02

    try:
        dither_amt = float(spec.get("dither_amount", 1.0))
    except Exception:
        dither_amt = 1.0

    lead = spec.get("lead_instrument")
    if lead:
        lead = _normalize_instruments([lead])[0]

    sfz_inst = spec.get("sfz_instrument")
    sfz_sampler = None
    if sfz_inst:
        try:
            sfz_path = _resolve_sfz_path(sfz_inst)
            sfz_sampler = SfzSampler.from_file(sfz_path)
            lead = None
        except Exception as e:
            logger.warning({"stage": "sfz_load_fail", "error": str(e)})

    motif = {
        "mood": spec.get("mood") or [],
        "instruments": spec.get("instruments") or [],
        "lead_instrument": lead,
        "ambience": spec.get("ambience") or [],
        "ambience_level": amb_lvl,
        "key": key_letter,
        "mode": key_mode,
        "drum_pattern": spec.get("drum_pattern"),
        "hq_stereo": spec.get("hq_stereo", True),
        "hq_reverb": spec.get("hq_reverb", True),
        "hq_sidechain": spec.get("hq_sidechain", True),
        "hq_chorus": spec.get("hq_chorus", True),
        "limiter_drive": limiter_drive,
    }
    if sfz_sampler is not None:
        motif["sfz_instrument"] = sfz_inst
        motif["sfz_sampler"] = sfz_sampler

    try:
        chord_span_beats = int(spec.get("chord_span_beats", 4))
        if chord_span_beats not in (2, 4, 8):
            chord_span_beats = 4
    except Exception:
        chord_span_beats = 4

    song = build_song(
        sections,
        bpm=bpm,
        seed=seed,
        motif=motif,
        variety=variety,
        chord_span_beats=chord_span_beats,
    )
    logger.info({"stage": "post", "message": "cleaning audio"})
    post_rng = np.random.default_rng((seed ^ 0x5A5A5A5A) & 0xFFFFFFFF)
    wow_cfg = spec.get("wow_flutter")
    if spec.get("lofi_filter", True):
        song = enhanced_post_process_chain(
            song,
            rng=post_rng,
            drive=limiter_drive,
            dither_amount=dither_amt,
            wow_flutter=wow_cfg,
        )
    return song, bpm

# ---------- Main ----------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--song-json", required=True, help="JSON blob from Tauri SongSpec")
    parser.add_argument("--out", required=True, help="Output WAV path")
    parser.add_argument(
        "--instruments-file",
        help="Path to instruments.json (override or use env BLOSSOM_INSTRUMENTS_FILE)",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        help="Logging level (e.g. INFO, DEBUG, WARNING)",
    )
    args = parser.parse_args()

    logging.getLogger().setLevel(args.log_level.upper())

    if args.instruments_file:
        global INSTRUMENTS_DATA
        INSTRUMENTS_DATA = _load_instruments(args.instruments_file)

    spec = json.loads(args.song_json)
    album = spec.get("album")

    logger.info({"stage": "generate", "message": "building sections"})
    song, _ = render_from_spec(spec)

    out_path = args.out
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    tmp_path = out_path.replace(".wav", ".tmp.wav")

    tags = {"title": spec.get("title")}
    if album:
        tags["album"] = album

    song.export(
        tmp_path,
        format="wav",
        parameters=["-acodec", "pcm_s16le"],
        tags=tags,
    )
    if os.path.exists(out_path):
        os.remove(out_path)
    os.replace(tmp_path, out_path)

    info = {"stage": "done", "message": "saved", "path": out_path}
    if album:
        info["album"] = album
    logger.info(info)

if __name__ == "__main__":
    main()
