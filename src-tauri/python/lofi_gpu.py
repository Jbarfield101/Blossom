# lofi_gpu.py (Blossom) — VARIATION UPGRADE, hardened
# - Same CLI, JSON spec, and output behavior
# - Fixes: safe 'variety' parsing (handles null), "Auto"/missing key,
#          None-safe lists, decay clamp, small FFmpeg warning silencer.
# - Upgrades: bass follows per-chord progression, calmer LUFS & darker LPF,
#             hat micro-duck on snare, gentler ambience & LPF, chord
#             velocity variation, subtle hat wow, better mix balance.

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

# Silence the early pydub warning before we wire ffmpeg manually
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

# ---------- Post-processing ----------
def soft_clip_np(x: np.ndarray, drive: float = 1.0) -> np.ndarray:
    return np.tanh(x * drive)

def apply_soft_limit(audio: AudioSegment, drive: float = 1.05) -> AudioSegment:
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
    try:
        import pyloudnorm as pyln
        samples = np.array(audio.get_array_of_samples()).astype(np.float32)
        if audio.channels == 2:
            samples = samples.reshape((-1, 2)).mean(axis=1)
        max_int = float(2 ** (8 * audio.sample_width - 1))
        x = samples / max_int
        meter = pyln.Meter(audio.frame_rate)
        loudness = meter.integrated_loudness(x)
        gain_needed = target_lufs - loudness
        return audio.apply_gain(gain_needed)
    except Exception:
        return effects.normalize(audio)

def enhanced_post_process_chain(audio: AudioSegment, rng=None) -> AudioSegment:
    """Darker, warmer finishing chain for lofi character."""
    a = loudness_normalize_lufs(audio, target_lufs=-16.0)
    a = a.high_pass_filter(30)

    # multi-stage low-pass to emulate vintage gear
    lpf_base = 7500
    if rng is not None:
        lpf_base = int(rng.integers(6500, 8500))
    a = a.low_pass_filter(lpf_base + 500)
    a = a.low_pass_filter(lpf_base)

    # simple vintage EQ: slight mid boost and presence dip
    mids = a.low_pass_filter(2000).high_pass_filter(200).apply_gain(1.5)
    a = a.overlay(mids)
    presence = a.high_pass_filter(4000).apply_gain(-2.0)
    a = a.overlay(presence)

    drv = 1.05 if rng is None else float(rng.uniform(1.03, 1.07))
    a = apply_soft_limit(a, drive=drv)
    a = ensure_wav_bitdepth(a, sample_width=2)
    return a

# ---------- DSP building blocks ----------
def _np_to_segment(x: np.ndarray, frame_rate=SR) -> AudioSegment:
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
    # clamp decay to buffer length to avoid broadcasting errors
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

def _noise(ms, amp=0.3):
    n = int(ms * SR / 1000)
    return (amp * (np.random.rand(n).astype(np.float32) * 2 - 1)).astype(np.float32)

def _butter_lowpass(x, cutoff_hz):
    rc = 1.0 / (2 * np.pi * max(1.0, cutoff_hz))
    dt = 1.0 / SR
    alpha = dt / (rc + dt)
    y = np.zeros_like(x)
    for i in range(len(x)):
        y[i] = y[i-1] + alpha * (x[i] - y[i-1]) if i > 0 else x[0]
    return y

def _butter_highpass(x, cutoff_hz):
    rc = 1.0 / (2 * np.pi * max(1.0, cutoff_hz))
    dt = 1.0 / SR
    alpha = rc / (rc + dt)
    y = np.zeros_like(x)
    prev_x = x[0] if len(x) else 0.0
    for i in range(len(x)):
        y[i] = (y[i-1] + x[i] - prev_x) * alpha if i > 0 else 0.0
        prev_x = x[i]
    return y

def _kick(ms=160):
    body = _pitch_sweep(90, 45, ms, amp=0.9) * _env_ad(ms*0.9, ms)
    click = _noise(40, 0.2) * _env_ad(20, 40)
    x = body.copy()
    x[:len(click)] += click
    x = _butter_lowpass(x, 150)
    return x

def _snare(ms=180):
    tone = _sine(180, ms, 0.05) * _env_ad(120, ms)
    noise = _noise(ms, 0.5) * _env_ad(140, ms)
    x = noise + tone
    x = _butter_highpass(x, 180)
    return x

def _hat(ms=60):
    n = _noise(ms, 0.4)
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

def _bar_ms(bpm):
    return int((60.0 / bpm) * 4 * 1000)

def _beats_ms(bpm):
    beat = int((60.0 / bpm) * 1000)
    eighth = beat // 2
    sixteenth = beat // 4
    return beat, eighth, sixteenth

# ---------- Harmony helpers ----------
SEMITONES = {"C":0,"C#":1,"Db":1,"D":2,"D#":3,"Eb":3,"E":4,"F":5,"F#":6,"Gb":6,"G":7,"G#":8,"Ab":8,"A":9,"A#":10,"Bb":10,"B":11}

def _degree_to_root_semi(deg: str) -> int:
    # Diatonic degrees in C (I=0), ii=2, iii=4, IV=5, V=7, vi=9
    return {"I":0,"ii":2,"iii":4,"IV":5,"V":7,"vi":9}.get(deg, 0)

def _chord_freqs_from_degree(key_letter: str, deg: str, add7=False, add9=False, inversion=0):
    key_off = SEMITONES.get(key_letter.upper(), 0)
    root_c = _degree_to_root_semi(deg)
    root_midi = 48 + ((root_c + key_off) % 12)  # around C3
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

def _lofi_rhodes_chord(freqs, ms, amp=0.12):
    env = _env_ad(ms*0.85, ms)
    t = np.arange(int(ms * SR / 1000)) / SR
    out = np.zeros_like(t, dtype=np.float32)
    wow = 1.0 + 0.003*np.sin(2*np.pi*0.5*t) + 0.002*np.sin(2*np.pi*3*t)
    for f in freqs:
        det = f * (1.0 + 0.01*(np.random.rand() - 0.5))
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
    # odd eighths delayed (long-short)
    if sub_idx % 2 == 1:
        long = swing * 2.0 * eighth_ms - eighth_ms
        return long - eighth_ms
    return 0.0

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
    wow_rate = rng.uniform(0.15, 0.35)  # Hz
    wow_depth = rng.uniform(0.003, 0.006)  # fraction of eighth

    # --- drums & hats
    for bar in range(bars):
        bar_start = bar * _bar_ms(bpm)

        # kicks
        for beat_idx, frac in pat["kick"]:
            pos = bar_start + beat_idx * beat + frac * beat
            pos += _swing_offset(eighth, int(frac*8) % 8, swing)
            pos += _jitter_ms(rng, jitter_std)
            k = _kick(int(rng.uniform(140, 180))) * _vel_scale(rng, mean=1.0)
            _place(k, drums, pos)

        # snares
        for beat_idx, frac in pat["snare"]:
            pos = bar_start + beat_idx * beat + frac * beat + _jitter_ms(rng, jitter_std)
            s = _snare(int(rng.uniform(160, 190))) * _vel_scale(rng, mean=1.0)
            _place(s, drums, pos)
            # micro-duck hats around snare
            snare_center = pos
            dip_len = int(0.06 * 1000)  # 60ms
            i0 = int(max(0, snare_center - 15) * SR / 1000)
            i1 = min(len(hats), i0 + int(dip_len * SR / 1000))
            if i1 > i0:
                hats[i0:i1] *= 0.85

        # ghost notes
        if rng.random() < ghost_prob:
            pos = bar_start + beat * rng.choice([0.75, 1.75, 2.75, 3.75]) + _jitter_ms(rng, jitter_std)
            g = _snare(120) * 0.35 * _vel_scale(rng, mean=0.9)
            _place(g, drums, pos)

        # hats (8ths) w/ swing, wow & dropouts
        if pat["hat_8ths"]:
            for sub in range(8):
                if rng.random() < hat_prob:
                    pos = bar_start + sub * eighth
                    pos += _swing_offset(eighth, sub, swing)
                    pos += _jitter_ms(rng, jitter_std*0.6)
                    # wow modulation
                    phase = 2*np.pi*wow_rate*((bar_start + sub*eighth)/1000.0)
                    pos += wow_depth * eighth * np.sin(phase)
                    h = _hat(int(rng.uniform(45, 70))) * _vel_scale(rng, mean=0.95)
                    _place(h, hats, pos)

        # simple 1-bar fill at each 4 bars
        if (bar + 1) % 4 == 0 and rng.random() < fill_prob:
            for sidx in range(8, 16):
                if rng.random() < 0.6:
                    pos = bar_start + beat*4 - (16 - sidx) * sixteenth
                    pos += _jitter_ms(rng, jitter_std*0.5)
                    r = _hat(40) * 0.8 if rng.random() < 0.7 else _snare(90) * 0.5
                    _place(r, drums, pos)

    drums = _process_drums(drums)

    # --- harmony: choose progression + voicing options
    key_letter_raw = motif.get("key")
    key_letter = (str(key_letter_raw or "C")[:1]).upper()
    if key_letter_raw is None or str(key_letter_raw).lower() == "auto":
        # pick stable key from seed in main(); keep defensive here
        pass

    if section_name.upper().startswith("A"):
        prog_seq = rng.choice(PROG_BANK_A)
    elif section_name.upper().startswith("B"):
        prog_seq = rng.choice(PROG_BANK_B)
    else:
        prog_seq = rng.choice(PROG_BANK_INTRO)

    add7 = (rng.random() < add7_prob)
    add9 = (rng.random() < add9_prob)
    inv_cycle = int(rng.integers(0, 3))  # 0..2 inversions

    instrs = motif.get("instruments") or []

    ep_prob = float(np.clip(0.3 + 0.4*t, 0, 1))
    gtr_prob = float(np.clip(0.25 + 0.35*t, 0, 1))
    pad_prob = float(np.clip(0.4 + 0.3*t, 0, 1))
    use_electric = ("electric piano" in instrs) and (rng.random() < ep_prob)
    use_clean_gtr = ("clean electric guitar" in instrs) and (rng.random() < gtr_prob)
    use_airy_pad = ("airy pads" in instrs) and (rng.random() < pad_prob)

    chord_len = 2 * beat
    chord_pos = 0

    chord_roots_hz: List[float] = []

    while chord_pos < dur_ms:
        deg = prog_seq[(chord_pos // chord_len) % len(prog_seq)]
        freqs = _chord_freqs_from_degree(key_letter, deg, add7=add7, add9=add9, inversion=inv_cycle)
        chord_roots_hz.append(freqs[0])

        # per-chord velocity drift
        vel = _vel_scale(rng, mean=1.0, std=0.05, lo=0.9, hi=1.1)

        if "rhodes" in instrs or not instrs:
            chord = _lofi_rhodes_chord(freqs, min(chord_len, dur_ms - chord_pos), amp=0.12) * vel
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(chord))
            keys[i0:i1] += chord[: i1 - i0]
        if "nylon guitar" in instrs:
            nylon = _nylon_chord(freqs, min(chord_len, dur_ms - chord_pos), amp=0.1) * vel
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(nylon))
            keys[i0:i1] += nylon[: i1 - i0]
        if use_electric:
            ep = _electric_piano_chord(freqs, min(chord_len, dur_ms - chord_pos), amp=0.1) * vel
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(ep))
            keys[i0:i1] += ep[: i1 - i0]
        if use_clean_gtr:
            gtr = _clean_guitar_chord(freqs, min(chord_len, dur_ms - chord_pos), amp=0.08) * vel
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(gtr))
            keys[i0:i1] += gtr[: i1 - i0]
        if "pads" in instrs and "rhodes" not in instrs:
            pad = _lofi_rhodes_chord(freqs, min(chord_len*2, dur_ms - chord_pos), amp=0.08) * vel
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(pad))
            keys[i0:i1] += pad[: i1 - i0]
        if use_airy_pad:
            airy = _airy_pad_chord(freqs, min(chord_len*2, dur_ms - chord_pos), amp=0.06) * vel
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(airy))
            keys[i0:i1] += airy[: i1 - i0]

        chord_pos += chord_len

    # --- bass patterns (per-chord roots, not just the last one)
    bass_pat = rng.choice(BASS_PATTERNS)
    use_bass = any(i in instrs for i in ["upright bass", "bass", "rhodes"]) or not instrs

    if use_bass:
        for chord_idx, root_hz in enumerate(chord_roots_hz):
            chord_start = chord_idx * chord_len
            if chord_start >= dur_ms:
                break
            # Which bars does this chord touch?
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

    amb_level = float(np.clip(motif.get("ambience_level", 0.5), 0.0, 1.0))  # default lower

    amb_mix = np.zeros(n, dtype=np.float32)
    if "rain" in amb_list:
        r = (np.random.rand(n).astype(np.float32)*2-1)*0.01
        r = _butter_lowpass(r, 1200)
        amb_mix += r
    if "cafe" in amb_list:
        c = (np.random.rand(n).astype(np.float32)*2-1)*0.0015
        c = _butter_lowpass(c, 4000)
        amb_mix += c

    mix = 0.72*drums + 0.55*hats + 0.68*keys + 0.52*bass + 0.12*amb_mix*amb_level
    mix = np.tanh(mix * 1.18).astype(np.float32)
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

    # Optional global variety knob (0..100); handle null/strings safely
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
            {"name": "A", "bars": 16},
            {"name": "Outro", "bars": 8},
        ]
    sections = [(s["name"], int(s["bars"])) for s in structure]

    # Motif & defaults
    key_val = spec.get("key")
    if key_val is None or str(key_val).lower() == "auto":
        rng_key = np.random.default_rng((seed ^ 0xA5A5A5A5) & 0xFFFFFFFF)
        key_val = rng_key.choice(list("CDEFGAB"))

    try:
        amb_lvl = float(spec.get("ambience_level", 0.5))  # default lower
    except Exception:
        amb_lvl = 0.5

    motif = {
        "mood": spec.get("mood") or [],
        "instruments": spec.get("instruments") or [],
        "ambience": spec.get("ambience") or [],
        "ambience_level": amb_lvl,
        "key": key_val,
        "drum_pattern": spec.get("drum_pattern"),
    }

    print(json.dumps({"stage": "generate", "message": "building sections"}))
    song = build_song(sections, bpm=bpm, seed=seed, motif=motif, variety=variety)

    print(json.dumps({"stage": "post", "message": "cleaning audio"}))
    # seed post-FX too so two renders at same seed are exactly repeatable
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
