# lofi_gpu.py
# Song-mode lofi renderer for Blossom (non-stream)
# - Accepts JSON SongSpec from Tauri
# - Generates sectioned audio with fixed seed
# - Crossfades sections
# - Post-process: normalize, HPF/LPF, soft-limit, export
#
# Dependencies:
#   pip install pydub numpy
#   (optional) pip install pyloudnorm
# Requires FFmpeg available in PATH for pydub (we set it explicitly below).

import argparse
import json
import os
import random
import sys
from typing import List, Dict, Tuple, Any

from pydub import AudioSegment, effects
from pydub.utils import which
import numpy as np

# ---------- FFmpeg wiring (must run BEFORE any export/decoding) ----------
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
# ------------------------------------------------------------------------

# ---------- Utilities ----------
SR = 44100

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

def apply_soft_limit(audio: AudioSegment, drive: float = 1.1) -> AudioSegment:
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

def post_process_chain(audio: AudioSegment) -> AudioSegment:
    a = loudness_normalize_lufs(audio, target_lufs=-14.0)
    a = a.high_pass_filter(30)
    a = a.low_pass_filter(18000)
    a = apply_soft_limit(a, drive=1.05)
    a = ensure_wav_bitdepth(a, sample_width=2)  # 16-bit
    return a

# ---------- Procedural lo-fi generator (replaces static stub) ----------
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
    n = int(length_ms * SR / 1000)
    d = int(decay_ms * SR / 1000)
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

def _bar_ms(bpm):
    return int((60.0 / bpm) * 4 * 1000)

def _beats_ms(bpm):
    beat = int((60.0 / bpm) * 1000)
    eighth = beat // 2
    sixteenth = beat // 4
    return beat, eighth, sixteenth

def _note_freq(note):
    pitch = {"C":0,"C#":1,"Db":1,"D":2,"D#":3,"Eb":3,"E":4,"F":5,"F#":6,"Gb":6,"G":7,"G#":8,"Ab":8,"A":9,"A#":10,"Bb":10,"B":11}
    name = ''.join([c for c in note if c.isalpha() or c in ['#','b']])
    octave = int(''.join([c for c in note if c.isdigit()])) if any(ch.isdigit() for ch in note) else 4
    n = pitch[name] + (octave - 4) * 12
    return 440.0 * (2 ** ((n - 9) / 12.0))

def _triad(root_note, quality="maj"):
    root = _note_freq(root_note)
    if quality == "min":
        third = root * (2 ** (3/12))
    else:
        third = root * (2 ** (4/12))
    fifth = root * (2 ** (7/12))
    return [root, third, fifth]

def _key_center(key_letter):
    return key_letter + "3"  # e.g., "C3"

def _rhodes_chord(freqs, ms, amp=0.12):
    env = _env_ad(ms*0.85, ms)
    t = np.arange(int(ms * SR / 1000)) / SR
    out = np.zeros_like(t, dtype=np.float32)
    for f in freqs:
        out += 0.7*np.sin(2*np.pi*f*t) + 0.3*np.sin(2*np.pi*(f*2)*t)
    out *= env * amp / max(1, len(freqs))
    wow = 1.0 + 0.002*np.sin(2*np.pi*5*t)  # subtle wow/flutter
    out *= wow.astype(np.float32)
    return out

def _bass_note(freq, ms, amp=0.18):
    x = _sine(freq, ms, amp=amp)
    x = _butter_lowpass(x, 200)
    x *= _env_ad(ms*0.7, ms)
    return x

def _choose_prog(section_name, key_letter):
    root = _key_center(key_letter)
    degrees = {
        "I": _triad(root, "maj"),
        "IV": _triad({"C":"F","D":"G","E":"A","F":"Bb","G":"C","A":"D","B":"E"}.get(key_letter,"F")+"3","maj"),
        "V": _triad({"C":"G","D":"A","E":"B","F":"C","G":"D","A":"E","B":"F#"} .get(key_letter,"G")+"3","maj"),
        "vi": _triad({"C":"A","D":"B","E":"C#","F":"D","G":"E","A":"F#","B":"G#"} .get(key_letter,"A")+"3","min"),
    }
    if section_name.upper().startswith("A"):
        return ["I","vi","IV","V"], degrees
    elif section_name.upper().startswith("B"):
        return ["vi","IV","I","V"], degrees
    else:
        return ["I","IV"], degrees

def _render_section(bars, bpm, section_name, motif):
    dur_ms = bars_to_ms(bars, bpm)
    beat, eighth, sixteenth = _beats_ms(bpm)

    n = int(dur_ms * SR / 1000)
    drums = np.zeros(n, dtype=np.float32)
    bass  = np.zeros(n, dtype=np.float32)
    keys  = np.zeros(n, dtype=np.float32)
    hats  = np.zeros(n, dtype=np.float32)

    # Drums: Kick 1&3, Snare 2&4, Hats 8ths
    for bar in range(bars):
        bar_start = bar * _bar_ms(bpm)
        for beat_idx in [0, 2]:
            pos = bar_start + beat_idx * beat
            k = _kick(160)
            i0 = int(pos * SR / 1000); i1 = min(n, i0 + len(k))
            drums[i0:i1] += k[: i1 - i0]
        for beat_idx in [1, 3]:
            pos = bar_start + beat_idx * beat
            s = _snare(180)
            i0 = int(pos * SR / 1000); i1 = min(n, i0 + len(s))
            drums[i0:i1] += s[: i1 - i0]
        for sub in range(0, 8):
            pos = bar_start + sub * eighth
            h = _hat(60)
            i0 = int(pos * SR / 1000); i1 = min(n, i0 + len(h))
            hats[i0:i1] += h[: i1 - i0]

    # Harmony
    key_letter = (motif.get("key") or "C")[:1].upper()
    prog, degrees = _choose_prog(section_name, key_letter)
    chord_len = 2 * beat
    chord_pos = 0
    while chord_pos < dur_ms:
        deg = prog[(chord_pos // chord_len) % len(prog)]
        freqs = degrees[deg]
        if "rhodes" in motif.get("instruments", []):
            chord = _rhodes_chord(freqs, min(chord_len, dur_ms - chord_pos), amp=0.12)
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(chord))
            keys[i0:i1] += chord[: i1 - i0]
        elif "pads" in motif.get("instruments", []):
            pad = _rhodes_chord(freqs, min(chord_len*2, dur_ms - chord_pos), amp=0.08)
            i0 = int(chord_pos * SR / 1000); i1 = min(n, i0 + len(pad))
            keys[i0:i1] += pad[: i1 - i0]
        chord_pos += chord_len

    # Bass on roots (1 & 3)
    if any(i in motif.get("instruments", []) for i in ["upright bass","bass","rhodes"]):
        root_freq = _triad(_key_center(key_letter), "maj")[0]
        for bar in range(bars):
            for beat_idx in [0, 2]:
                pos = bar * _bar_ms(bpm) + beat_idx * beat
                b = _bass_note(root_freq, int(beat*0.9), amp=0.18)
                i0 = int(pos * SR / 1000); i1 = min(n, i0 + len(b))
                bass[i0:i1] += b[: i1 - i0]

    # Ambience
    amb_mix = np.zeros(n, dtype=np.float32)
    if "vinyl crackle" in motif.get("ambience", []):
        crack = _noise(dur_ms, 0.02)
        for tms in range(0, dur_ms, 500):
            if np.random.rand() < 0.08:
                i0 = int(tms * SR / 1000)
                ln = min(int(0.015 * SR), n - i0)
                if ln > 0:
                    amb_mix[i0:i0+ln] += (_noise(15, 0.4)[:ln])
        amb_mix += crack
    if "rain" in motif.get("ambience", []):
        amb_mix += _butter_lowpass(_noise(dur_ms, 0.04), 1200)
    if "cafe" in motif.get("ambience", []):
        amb_mix += _noise(dur_ms, 0.01)

    mix = 0.7*drums + 0.7*hats + 0.6*keys + 0.5*bass + 0.3*amb_mix
    mix = np.tanh(mix * 1.2).astype(np.float32)
    return _np_to_segment(mix)

def model_generate_audio(bars: int, bpm: int, seed: int, section: str, motif: Dict[str, Any]) -> AudioSegment:
    np.random.seed((seed + hash(section)) & 0xFFFFFFFF)
    random.seed(seed + hash(section) % (2**31 - 1))
    return _render_section(bars, bpm, section, motif)
# ---------- end procedural generator ----------

# ---------- Song builder ----------
def build_song(sections: List[Tuple[str, int]], bpm: int, seed: int, motif: Dict[str, Any]) -> AudioSegment:
    parts: List[AudioSegment] = []
    for name, bars in sections:
        part = model_generate_audio(bars=bars, bpm=bpm, seed=seed, section=name, motif=motif)
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

    bpm = int(spec.get("bpm", 80))
    seed = int(spec.get("seed", 12345))

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

    motif = {
        "mood": spec.get("mood", []),
        "instruments": spec.get("instruments", []),
        "ambience": spec.get("ambience", []),
        "key": spec.get("key", "C"),
    }

    print(json.dumps({"stage": "generate", "message": "building sections"}))
    song = build_song(sections, bpm=bpm, seed=seed, motif=motif)

    print(json.dumps({"stage": "post", "message": "cleaning audio"}))
    song = post_process_chain(song)

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
