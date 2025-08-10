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
# Requires FFmpeg available in PATH for pydub.

import argparse
import json
import math
import os
import random
from typing import List, Dict, Tuple, Any

from pydub import AudioSegment, effects
import numpy as np

# ---------- Utilities ----------

def bars_to_ms(bars: int, bpm: float, beats_per_bar: int = 4) -> int:
    """Convert bars @ bpm to milliseconds."""
    seconds_per_beat = 60.0 / float(bpm)
    seconds = bars * beats_per_bar * seconds_per_beat
    return int(seconds * 1000)

def crossfade_concat(sections: List[AudioSegment], ms: int = 120) -> AudioSegment:
    """Concatenate with crossfade between each segment."""
    if not sections:
        return AudioSegment.silent(duration=1)
    out = sections[0]
    for seg in sections[1:]:
        out = out.append(seg, crossfade=ms)
    return out

def ensure_wav_bitdepth(audio: AudioSegment, sample_width: int = 2) -> AudioSegment:
    """Force target bit depth (default 16-bit PCM)."""
    return audio.set_sample_width(sample_width)

# ---------- Simple post-processing chain ----------

def soft_clip_np(x: np.ndarray, drive: float = 1.0) -> np.ndarray:
    """
    Gentle soft-clip using tanh.
    x is float32/float64 in [-1, 1].
    """
    return np.tanh(x * drive)

def apply_soft_limit(audio: AudioSegment, drive: float = 1.1) -> AudioSegment:
    """
    Convert to numpy, soft clip, return to AudioSegment.
    """
    samples = np.array(audio.get_array_of_samples()).astype(np.float32)

    # stereo handling
    channels = audio.channels
    if channels == 2:
        samples = samples.reshape((-1, 2))
    else:
        samples = samples.reshape((-1, 1))

    # normalize to [-1, 1]
    max_int = float(2 ** (8 * audio.sample_width - 1))
    x = samples / max_int

    y = soft_clip_np(x, drive=drive)

    # back to int
    y = np.clip(y * max_int, -max_int, max_int - 1).astype(np.int16 if audio.sample_width == 2 else samples.dtype)

    if channels == 2:
        y = y.reshape((-1,))
    out = audio._spawn(y.tobytes())
    return out

def loudness_normalize_lufs(audio: AudioSegment, target_lufs: float = -14.0) -> AudioSegment:
    """
    If pyloudnorm is available, use it for LUFS targeting.
    Otherwise fall back to pydub normalize.
    """
    try:
        import pyloudnorm as pyln
        # Convert to numpy float32 mono for measurement
        samples = np.array(audio.get_array_of_samples()).astype(np.float32)
        if audio.channels == 2:
            samples = samples.reshape((-1, 2)).mean(axis=1)
        max_int = float(2 ** (8 * audio.sample_width - 1))
        x = samples / max_int

        meter = pyln.Meter(audio.frame_rate)  # EBU R128 meter
        loudness = meter.integrated_loudness(x)
        gain_needed = target_lufs - loudness
        return audio.apply_gain(gain_needed)
    except Exception:
        # Approximate
        return effects.normalize(audio)

def post_process_chain(audio: AudioSegment) -> AudioSegment:
    """
    Clean chain:
      1) Loudness normalize (target ~ -14 LUFS if possible)
      2) High-pass @ 30 Hz
      3) Low-pass @ 18 kHz
      4) Soft limiter
      5) Dither handled by encoder on export to 16-bit
    """
    a = loudness_normalize_lufs(audio, target_lufs=-14.0)
    a = a.high_pass_filter(30)
    a = a.low_pass_filter(18000)
    a = apply_soft_limit(a, drive=1.05)
    a = ensure_wav_bitdepth(a, sample_width=2)  # 16-bit
    return a

# ---------- Generation stubs ----------

def model_generate_audio(bars: int, bpm: int, seed: int, section: str, motif: Dict[str, Any]) -> AudioSegment:
    """
    REPLACE THIS with your real generator call.
    It must return a pydub.AudioSegment of the requested length.

    Temporary fallback:
      - creates a quiet ambience segment with light noise so the pipeline runs.
    """
    random.seed(seed + hash(section) % (2**31 - 1))
    duration_ms = bars_to_ms(bars, bpm)

    # Base silence
    seg = AudioSegment.silent(duration=duration_ms, frame_rate=44100).set_channels(2).set_sample_width(2)

    # Add a faint noise bed so it isn't flat silent (placeholder)
    # (You can remove once you plug in the model.)
    sr = seg.frame_rate
    n_samples = int(duration_ms * sr / 1000)
    noise = (np.random.rand(n_samples, 2).astype(np.float32) * 2 - 1) * 0.002  # very quiet
    noise_int16 = (noise * 32767).astype(np.int16).reshape(-1)
    noise_seg = AudioSegment(
        noise_int16.tobytes(),
        frame_rate=sr,
        sample_width=2,
        channels=2
    )
    seg = seg.overlay(noise_seg)

    return seg

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

    # Expected spec keys (from Tauri):
    # title, outDir (handled in Rust), bpm, key, structure[{name,bars}], mood[], instruments[], ambience[], seed
    bpm = int(spec.get("bpm", 80))
    seed = int(spec.get("seed", 12345))

    structure = spec.get("structure")
    if not structure:
        # default lofi structure if none provided
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

    # Generate
    print(json.dumps({"stage": "generate", "message": "building sections"}))
    song = build_song(sections, bpm=bpm, seed=seed, motif=motif)

    # Post-process
    print(json.dumps({"stage": "post", "message": "cleaning audio"}))
    song = post_process_chain(song)

    # Export
    out_path = args.out
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    tmp_path = out_path.replace(".wav", ".tmp.wav")

    # Write temp then rename (safer on Windows)
    song.export(tmp_path, format="wav", parameters=["-acodec", "pcm_s16le"])
    if os.path.exists(out_path):
        os.remove(out_path)
    os.replace(tmp_path, out_path)

    print(json.dumps({"stage": "done", "message": "saved", "path": out_path}))

if __name__ == "__main__":
    main()
