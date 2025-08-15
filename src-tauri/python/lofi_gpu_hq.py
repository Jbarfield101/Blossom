# lofi_gpu.py (Blossom HQ)
# lofi_gpu.py (Blossom HQ)
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
#   - Feature flags: hq_stereo / hq_reverb / hq_sidechain (default True)
#   - Mood-aware mix & ambience levels
#   - Optional lofi piano instrument

import argparse
import json
import os
import random
import sys
import hashlib
import warnings
from typing import List, Dict, Tuple, Any

import numpy as np
from pydub import AudioSegment, effects
from pydub.utils import which
from scipy.signal import butter, filtfilt

warnings.filterwarnings("ignore", message="Couldn't find ffmpeg or avconv")

# ---------- FFmpeg wiring ----------
def _set_ffmpeg_paths():
    exe_dir = os.path.dirname(sys.executable)
    candidates_ffmpeg = [
        os.path.join(exe_dir, "ffmpeg.exe"),
        os.path.join(exe_dir, "Library", "bin", "ffmpeg.exe"),
        os.path.join(exe_dir, "..", "Library", "bin", "ffmpeg.exe"),
        which("ffmpeg"),
    ]
    candidates_ffprobe = [
        os.path.join(exe_dir, "ffprobe.exe"),
        os.path.join(exe_dir, "Library", "bin", "ffprobe.exe"),
        os.path.join(exe_dir, "..", "Library", "bin", "ffprobe.exe"),
        which("ffprobe"),
    ]
    set_any = False
    for p in candidates_ffmpeg:
        if p and os.path.exists(p):
            AudioSegment.converter = p
            AudioSegment.ffmpeg = p
            print(json.dumps({"stage": "info", "message": "ffmpeg set", "path": p}))
            set_any = True
            break
    for p in candidates_ffprobe:
        if p and os.path.exists(p):
            AudioSegment.ffprobe = p
            print(json.dumps({"stage": "info", "message": "ffprobe set", "path": p}))
            break
    if not set_any:
        print(json.dumps({"stage": "warn", "message": "ffmpeg not found; pydub exports will fail"}))
_set_ffmpeg_paths()
# -----------------------------------

SR = 44100

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

def ensure_wav_bitdepth(audio: AudioSegment, sample_width: int = 2) -> AudioSegment:
    return audio.set_sample_width(sample_width)


def _normalize_instruments(instrs):
    alias = {"pads": "airy pads"}
    canon = [
        "electric piano",
        "upright bass",
        "clean electric guitar",
        "nylon guitar",
        "airy pads",
        "piano",
        "rhodes",
        "bass",
    ]
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
def soft_clip_np(x: np.ndarray, drive: float = 1.0) -> np.ndarray:
    x = x * drive
    return x / (1.0 + np.abs(x))

def apply_soft_limit(audio: AudioSegment, drive: float = 1.02) -> AudioSegment:
    samples = np.array(audio.get_array_of_samples()).astype(np.float32)
    channels = audio.channels
    if channels == 2:
        samples = samples.reshape((-1, 2))
    else:
        samples = samples.reshape((-1, 1))
    max_int = float(2 ** (8 * audio.sample_width - 1))
    x = samples / max_int
    y = soft_clip_np(x, drive=drive)
    y = np.clip(y * max_int, -max_int, max_int - 1).astype(np.int16 if audio.sample_width == 2 else samples.dtype)
    if channels == 2:
        y = y.reshape((-1,))
    out = audio._spawn(y.tobytes())
    return out

def loudness_normalize_lufs(audio: AudioSegment, target_lufs: float = -14.0) -> AudioSegment:
    samples = np.array(audio.get_array_of_samples()).astype(np.float32)
    if audio.channels == 2:
        samples = samples.reshape((-1, 2)).mean(axis=1)
    max_int = float(2 ** (8 * audio.sample_width - 1))
    x = samples / max_int
    try:
        import pyloudnorm as pyln
        meter = pyln.Meter(audio.frame_rate)
        loudness = meter.integrated_loudness(x)
    except ImportError:
        rms = np.sqrt(np.mean(np.square(x)))
        if rms <= 0:
            return audio
        loudness = 20 * np.log10(rms)
        print(json.dumps({"stage": "warn", "message": "pyloudnorm missing, using RMS loudness estimate"}))
    except Exception as e:
        print(json.dumps({"stage": "warn", "message": f"loudness normalization failed: {e}"}))
        return audio
    gain_needed = target_lufs - loudness
    return audio.apply_gain(gain_needed)

def enhanced_post_process_chain(audio: AudioSegment, rng=None) -> AudioSegment:
    """Darker, warmer finishing chain for lofi character."""
    a = audio.high_pass_filter(30)

    lpf_base = 7500
    if rng is not None:
        lpf_base = int(rng.integers(6500, 8500))
    a = a.low_pass_filter(lpf_base + 500)
    a = a.low_pass_filter(lpf_base)

    mids = a.low_pass_filter(2000).high_pass_filter(200).apply_gain(1.5)
    a = a.overlay(mids)
    presence = a.high_pass_filter(4000).apply_gain(-2.0)
    a = a.overlay(presence)

    drv = 1.04 if rng is None else float(rng.uniform(1.02, 1.06))
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
    a = ensure_wav_bitdepth(a, sample_width=2)
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

def _butter_lowpass(x, cutoff_hz):
    nyq = 0.5 * SR
    norm = min(cutoff_hz / nyq, 0.999)
    b, a = butter(4, norm, btype="low")
    return filtfilt(b, a, x).astype(np.float32)

def _butter_highpass(x, cutoff_hz):
    nyq = 0.5 * SR
    norm = min(cutoff_hz / nyq, 0.999)
    b, a = butter(4, norm, btype="high")
    return filtfilt(b, a, x).astype(np.float32)

def _butter_bandpass(x, low_hz, high_hz):
    nyq = 0.5 * SR
    low = max(0.0, low_hz / nyq)
    high = min(high_hz / nyq, 0.999)
    b, a = butter(2, [low, high], btype="band")
    return filtfilt(b, a, x).astype(np.float32)

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
    _apply_duck_envelope(y, snare_positions_ms, depth_db=1.0, attack_ms=5, hold_ms=20, release_ms=60)
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

# ---------- Stereo & mix polish helpers ----------
def _shift_ms(x: np.ndarray, ms: float) -> np.ndarray:
    nshift = int(SR * (ms / 1000.0))
    if nshift == 0:
        return x
    if nshift > 0:
        return np.concatenate([np.zeros(nshift, dtype=x.dtype), x[:-nshift]])
    nshift = -nshift
    return np.concatenate([x[nshift:], np.zeros(nshift, dtype=x.dtype)])

def stereoize_np(x: np.ndarray) -> np.ndarray:
    """Tasteful widening: Haas micro-delay on a tiny HF component."""
    hf = _butter_highpass(x, 2500) * 0.06
    left  = x + _shift_ms(hf, -0.9)
    right = x + _shift_ms(hf,  0.9)
    haas = np.stack([left, right], axis=-1)
    dry  = np.stack([x, x], axis=-1)
    stereo = 0.75 * dry + 0.25 * haas
    return stereo.astype(np.float32)

def _apply_duck_envelope(buf: np.ndarray, positions_ms: List[float], depth_db=2.0, attack_ms=14, hold_ms=30, release_ms=180):
    if not positions_ms:
        return
    depth = 10 ** (-abs(depth_db) / 20.0)
    env = np.ones_like(buf, dtype=np.float32)
    a = int(SR * attack_ms/1000.0)
    h = int(SR * hold_ms/1000.0)
    r = int(SR * release_ms/1000.0)
    for pos in positions_ms:
        p = int(max(0, pos) * SR / 1000)
        # attack
        for i in range(a):
            j = p + i
            if j >= len(env): break
            t = i / max(1, a)
            env[j] = min(env[j], 1.0 - t*(1.0-depth))
        # hold
        for i in range(h):
            j = p + a + i
            if j >= len(env): break
            env[j] = min(env[j], depth)
        # release
        for i in range(r):
            j = p + a + h + i
            if j >= len(env): break
            t = i / max(1, r)
            env[j] = min(env[j], depth + (1.0-depth)*t)
    buf *= env

def _schroeder_room(x: np.ndarray, mix=0.12, pre_ms=12, decay=0.35):
    if mix <= 0:
        return x
    def comb(sig, d_ms, fb):
        d = max(1, int(SR * d_ms/1000.0))
        y = np.zeros_like(sig, dtype=np.float32)
        for i in range(len(sig)):
            y[i] = sig[i] + (y[i-d] * fb if i >= d else 0.0)
        return y
    def allpass(sig, d_ms, g):
        d = max(1, int(SR * d_ms/1000.0))
        y = np.zeros_like(sig, dtype=np.float32)
        for i in range(len(sig)):
            xn = sig[i]
            y[i] = ((y[i-d] if i >= d else 0.0) + g * (xn - (y[i-d] if i >= d else 0.0)))
        return y
    dry = x
    x = _shift_ms(x, pre_ms)
    wet = (
        comb(x, 29, decay*0.70) +
        comb(x, 37, decay*0.66) +
        comb(x, 41, decay*0.62) +
        comb(x, 53, decay*0.58)
    ) * 0.25
    wet = allpass(wet, 7, 0.65)
    wet = allpass(wet, 3, 0.70)
    return (1.0 - mix) * dry + mix * wet

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

# ---------- Harmony helpers ----------
SEMITONES = {"C":0,"C#":1,"Db":1,"D":2,"D#":3,"Eb":3,"E":4,"F":5,"F#":6,"Gb":6,"G":7,"G#":8,"Ab":8,"A":9,"A#":10,"Bb":10,"B":11}

def _degree_to_root_semi(deg: str) -> int:
    return {"I":0,"ii":2,"iii":4,"IV":5,"V":7,"vi":9}.get(deg, 0)

def _chord_freqs_from_degree(key_letter: str, deg: str, add7=False, add9=False, inversion=0):
    key_off = SEMITONES.get(key_letter.upper(), 0)
    root_c = _degree_to_root_semi(deg)
    root_midi = 48 + ((root_c + key_off) % 12)
    quality = "min" if deg in ("ii","iii","vi") else "maj"
    triad = [root_midi, root_midi + (3 if quality=="min" else 4), root_midi + 7]
    if add7:
        triad.append(root_midi + (10 if quality=="min" else 11))
    if add9:
        triad.append(root_midi + 14)
    for _ in range(inversion):
        triad[0] += 12
        triad.sort()
    return [440.0 * (2 ** ((m - 69)/12.0)) for m in triad]

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
}

PROG_BANK_A = [["I","vi","IV","V"], ["I","V","vi","IV"], ["I","iii","vi","IV"], ["I","vi","ii","V"], ["I","IV","ii","V"],
                ["I","IV","V","IV"], ["I","ii","V","IV"], ["I","V","IV","V"]]
PROG_BANK_B = [["vi","IV","I","V"], ["ii","V","I","vi"], ["IV","I","V","vi"], ["vi","ii","V","I"], ["IV","vi","ii","V"],
                ["vi","IV","ii","V"], ["ii","vi","IV","I"], ["vi","V","IV","V"]]
PROG_BANK_INTRO = [["I","IV"], ["ii","V"], ["I","V"], ["vi","IV"], ["I","ii"], ["I","vi"], ["IV","V"], ["ii","iii"]]

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
        "drum_gain": 0.35,
        "hat_gain": 0.25,
        "key_gain": 1.0,
        "bass_gain": 0.45,
        "pad_gain": 0.7,
    }

    if "calm" in mood or "chill" in mood:
        levels["drum_gain"] *= 0.7
        levels["key_gain"] *= 1.1
    if "energetic" in mood:
        levels["drum_gain"] *= 1.2
    if "melancholy" in mood:
        levels["key_gain"] *= 1.15
        levels["pad_gain"] *= 1.2

    if section_name.lower() in ["intro", "outro"]:
        levels["drum_gain"] *= 0.8
        levels["key_gain"] *= 0.9

    return levels

# ---------- Section renderer ----------
def _render_section(bars, bpm, section_name, motif, rng, variety=60):
    # Variety mapping (0..100)
    t = float(np.clip(variety, 0, 100)) / 100.0
    swing = 0.54 + 0.08*t
    jitter_std = 2.0 + 10.0*t
    ghost_prob = 0.2 + 0.6*t
    fill_prob = 0.15 + 0.35*t
    hat_prob = 0.95 - 0.2*t
    add7_prob = 0.3 + 0.5*t
    add9_prob = 0.1 + 0.35*t

    dur_ms = bars_to_ms(bars, bpm)
    beat, eighth, sixteenth = _beats_ms(bpm)

    n = int(dur_ms * SR / 1000)
    drums = np.zeros(n, dtype=np.float32)
    bass  = np.zeros(n, dtype=np.float32)
    keys  = np.zeros(n, dtype=np.float32)
    hats  = np.zeros(n, dtype=np.float32)

    # --- choose drum pattern
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
            for sidx in range(8, 16):
                if rng.random() < 0.6:
                    pos = bar_start + beat*4 - (16 - sidx) * sixteenth
                    pos += _jitter_ms(rng, jitter_std*0.5)
                    r = _hat(40, rng=rng) * 0.8 if rng.random() < 0.7 else _snare(90, rng=rng) * 0.5
                    _place(r, drums, pos)

    drums = _process_drums(drums)
    hats = _process_hats(hats, snare_positions_ms, variety)

    # --- harmony: choose progression + voicing options
    key_letter_raw = motif.get("key")
    key_letter = (str(key_letter_raw or "C")[:1]).upper()

    if section_name.upper().startswith("A"):
        prog_seq = rng.choice(PROG_BANK_A)
    elif section_name.upper().startswith("B"):
        prog_seq = rng.choice(PROG_BANK_B)
    else:
        prog_seq = rng.choice(PROG_BANK_INTRO)

    add7 = (rng.random() < add7_prob)
    add9 = (rng.random() < add9_prob)
    inv_cycle = int(rng.integers(0, 3))

    instrs = _normalize_instruments(motif.get("instruments"))
    print(json.dumps({"stage": "debug", "section": section_name, "instruments": instrs}))

    use_electric = ("electric piano" in instrs)
    use_clean_gtr = ("clean electric guitar" in instrs)
    use_airy_pad = ("airy pads" in instrs)

    chord_len = 2 * beat
    chord_pos = 0
    add_rhodes_default = (not instrs)

    chord_roots_hz: List[float] = []

    while chord_pos < dur_ms:
        deg = prog_seq[(chord_pos // chord_len) % len(prog_seq)]
        freqs = _chord_freqs_from_degree(key_letter, deg, add7=add7, add9=add9, inversion=inv_cycle)
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
        if use_electric:
            ep = _electric_piano_chord(freqs, min(chord_len, dur_ms - chord_pos), amp=0.18) * vel
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
            keys[i0:i1] += airy[: i1 - i0]

        chord_pos += chord_len

    if "piano" in instrs:
        keys = keys * 1.06
        keys = 0.9 * keys + 0.1 * _butter_highpass(keys, 1800)

    # --- bass patterns (per-chord roots)
    bass_pat = rng.choice(BASS_PATTERNS)
    use_bass = any(i in instrs for i in ["upright bass", "bass", "rhodes"]) or not instrs

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
                    b = _bass_note(root_hz, int(beat*3.8), amp=0.16) * _vel_scale(rng, mean=0.95)
                    _place(b, bass, pos + _jitter_ms(rng, jitter_std))
                else:
                    for beat_idx in [0, 2]:
                        pos = bar_start + beat_idx * beat + _jitter_ms(rng, jitter_std)
                        root = _bass_note(root_hz, int(beat*0.9), amp=0.18) * _vel_scale(rng)
                        _place(root, bass, pos)
                        if bass_pat == "root5_13" and rng.random() < 0.7:
                            pos5 = pos + beat*0.5 + _jitter_ms(rng, jitter_std*0.7)
                            fifth = _bass_note(root_hz*2**(7/12), int(beat*0.45), amp=0.14) * _vel_scale(rng, mean=0.9)
                            _place(fifth, bass, pos5)

    # --- ambience rotation
    amb_list = motif.get("ambience") or []
    if not amb_list:
       amb_list = random.choice([["rain"], ["cafe"], ["rain","cafe"]])

    amb_level = float(np.clip(motif.get("ambience_level", 0.5), 0.0, 1.0))

    amb_mix = np.zeros(n, dtype=np.float32)
    if "rain" in amb_list:
        r = ((rng.random(n).astype(np.float32)*2-1) if rng is not None else (np.random.rand(n).astype(np.float32)*2-1)) * 0.004
        r = _butter_lowpass(r, 1200)
        amb_mix += r
    if "cafe" in amb_list:
        c = ((rng.random(n).astype(np.float32)*2-1) if rng is not None else (np.random.rand(n).astype(np.float32)*2-1)) * 0.0008
        c = _butter_lowpass(c, 3000)
        mid = _butter_bandpass(c, 1000, 2000)
        c -= mid * 0.15
        amb_mix += c

    # more pronounced vinyl character for nostalgic mood
    if "nostalgic" in (motif.get("mood") or []):
        amb_mix += 0.6 * _vinyl_crackle(n, density=0.0012, ticky=0.006, rng=rng)
        amb_mix += _analog_noise_floor(n, level=0.0003, rng=rng)

    # --- feature flags (can be passed via motif; default True)
    flags = {
        "hq_stereo": True,
        "hq_reverb": True,
        "hq_sidechain": True,
    }
    for k in list(flags.keys()):
        if k in motif:
            try:
                flags[k] = bool(motif.get(k))
            except Exception:
                pass

    # light room reverb sends
    if flags.get("hq_reverb", True):
        drum_bus = drums + 0.6*hats
        keys_bus = keys * 0.5
        wet_drums = _schroeder_room(drum_bus, mix=0.10, pre_ms=10, decay=0.32)
        wet_keys  = _schroeder_room(keys_bus, mix=0.07, pre_ms=14, decay=0.28)
        drums = 0.85*drums + 0.4*(wet_drums - drum_bus)
        keys  = 0.95*keys  + 0.35*(wet_keys  - keys_bus)

    mood = motif.get("mood") or []

    # sidechain ducking to kick (subtle)
    if flags.get("hq_sidechain", True):
        depth = 2.0
        if "energetic" in mood or variety >= 70:
            depth = 2.5
        elif "calm" in mood or "melancholy" in mood or variety <= 40:
            depth = 1.2
        _apply_duck_envelope(keys, kick_positions_ms, depth_db=depth)
        _apply_duck_envelope(bass,  kick_positions_ms, depth_db=2.5)

    # final mix (mono bus)
    levels = calculate_mix_levels(mood, section_name)
    drum_gain = levels["drum_gain"]
    hat_gain = levels["hat_gain"]
    key_gain = levels["key_gain"]
    bass_gain = levels["bass_gain"]
    amb_gain = 0.12 * amb_level

    mix = drum_gain*drums + hat_gain*hats + key_gain*keys + bass_gain*bass + amb_gain*amb_mix
    mix = mix.astype(np.float32)

    # stereoize
    if flags.get("hq_stereo", True):
        stereo = stereoize_np(mix)
        return _np_to_segment(stereo)
    else:
        return _np_to_segment(mix)

# ---------- Public API ----------
def model_generate_audio(bars: int, bpm: int, seed: int, section: str, motif: Dict[str, Any], variety: int) -> AudioSegment:
    sec = _stable_hash_int(section)
    full_seed = (seed ^ sec) & 0xFFFFFFFF
    rng = np.random.default_rng(full_seed)
    random.seed(full_seed)
    return _render_section(bars, bpm, section, motif, rng=rng, variety=variety)

def build_song(sections: List[Tuple[str, int]], bpm: int, seed: int, motif: Dict[str, Any], variety: int) -> AudioSegment:
    parts: List[AudioSegment] = []
    for name, bars in sections:
        part = model_generate_audio(bars=bars, bpm=bpm, seed=seed, section=name, motif=motif, variety=variety)
        parts.append(part)
    song = crossfade_concat(parts, ms=120)
    return song

# ---------- Main ----------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--song-json", required=True, help="JSON blob from Tauri SongSpec")
    parser.add_argument("--out", required=True, help="Output WAV path")
    args = parser.parse_args()

    spec = json.loads(args.song_json)

    # BPM / Seed
    bpm = int(spec.get("bpm", 80))
    seed = int(spec.get("seed", 12345))

    # Variety (0..100) safe
    try:
        v = spec.get("variety", 60)
        variety = 60 if v is None else int(v)
    except Exception:
        variety = 60

    # Structure
    structure = spec.get("structure")
    if not structure:
        structure = [
            {"name": "Intro", "bars": 4},
            {"name": "A", "bars": 16},
            {"name": "B", "bars": 16},
            {"name": "A", "bars": 8},
            {"name": "Outro", "bars": 8},
        ]
    sections = [(s["name"], int(s["bars"])) for s in structure]

    # Motif & defaults
    key_val = spec.get("key")
    if key_val is None or str(key_val).lower() == "auto":
        rng_key = np.random.default_rng((seed ^ 0xA5A5A5A5) & 0xFFFFFFFF)
        key_val = rng_key.choice(list("CDEFGAB"))

    try:
        amb_lvl = float(spec.get("ambience_level", 0.5))
    except Exception:
        amb_lvl = 0.5

    motif = {
        "mood": spec.get("mood") or [],
        "instruments": spec.get("instruments") or [],
        "ambience": spec.get("ambience") or [],
        "ambience_level": amb_lvl,
        "key": key_val,
        "drum_pattern": spec.get("drum_pattern"),
        # optional HQ flags from UI (default True if omitted)
        "hq_stereo": spec.get("hq_stereo", True),
        "hq_reverb": spec.get("hq_reverb", True),
        "hq_sidechain": spec.get("hq_sidechain", True),
    }

    print(json.dumps({"stage": "generate", "message": "building sections"}))
    song = build_song(sections, bpm=bpm, seed=seed, motif=motif, variety=variety)

    print(json.dumps({"stage": "post", "message": "cleaning audio"}))
    post_rng = np.random.default_rng((seed ^ 0x5A5A5A5A) & 0xFFFFFFFF)
    song = enhanced_post_process_chain(song, rng=post_rng)

    out_path = args.out
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    tmp_path = out_path.replace(".wav", ".tmp.wav")

    song.export(tmp_path, format="wav", parameters=["-acodec", "pcm_s16le"])
    if os.path.exists(out_path):
        os.remove(out_path)
    os.replace(tmp_path, out_path)

    print(json.dumps({"stage": "done", "message": "saved", "path": out_path}))

if __name__ == "__main__":
    main()
