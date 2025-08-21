"""I/O utilities extracted from lofi_gpu_hq."""

import json
import os
import sys
from typing import Any, Dict, List, Optional

import numpy as np
from pydub import AudioSegment
from pydub.utils import which

from effects import SR, _butter_lowpass, apply_wow_flutter, apply_tape_saturation, apply_soft_limit

INSTRUMENTS_ENV = "BLOSSOM_INSTRUMENTS_FILE"
DEFAULT_INSTRUMENTS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "instruments.json"
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


INSTRUMENTS_DATA = _load_instruments(
    os.environ.get(INSTRUMENTS_ENV, DEFAULT_INSTRUMENTS_PATH)
)


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
    try:
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
    except (FileNotFoundError, OSError) as e:
        print(json.dumps({"stage": "error", "message": f"ffmpeg configuration failed: {e}"}))
        return
    if not set_any:
        print(
            json.dumps(
                {
                    "stage": "warn",
                    "message": "ffmpeg not found; please install ffmpeg and ensure it is on PATH",
                }
            )
        )


_set_ffmpeg_paths()
# -----------------------------------

def crossfade_concat(sections: List[AudioSegment], ms: int = 120) -> AudioSegment:
    if not sections:
        return AudioSegment.silent(duration=1)
    out = sections[0]
    for seg in sections[1:]:
        out = out.append(seg, crossfade=ms)
    return out


def apply_dither(
    audio: AudioSegment,
    sample_width: int,
    amount: float = 1.0,
    rng: Optional[np.random.Generator] = None,
) -> AudioSegment:
    """Add low-level triangular dither prior to bit depth reduction."""
    if amount <= 0:
        return audio
    samples = np.array(audio.get_array_of_samples())
    max_int = float(2 ** (8 * audio.sample_width - 1))
    floats = samples.astype(np.float32) / max_int
    lsb = 1.0 / (2 ** (8 * sample_width - 1))
    if rng is not None:
        r1 = rng.random(floats.shape)
        r2 = rng.random(floats.shape)
    else:
        r1 = np.random.random(floats.shape)
        r2 = np.random.random(floats.shape)
    noise = (r1 - r2) * lsb * float(amount)
    floats = np.clip(floats + noise, -1.0, 1.0)
    dithered = (floats * max_int).astype(samples.dtype)
    return audio._spawn(dithered.tobytes())


def ensure_wav_bitdepth(
    audio: AudioSegment,
    sample_width: int = 2,
    dither_amount: float = 1.0,
    rng: Optional[np.random.Generator] = None,
) -> AudioSegment:
    """Reduce bit depth with optional TPDF dithering."""
    if audio.sample_width > sample_width:
        audio = apply_dither(audio, sample_width, amount=dither_amount, rng=rng)
    return audio.set_sample_width(sample_width)


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
        print(
            json.dumps(
                {
                    "stage": "warn",
                    "message": "pyloudnorm missing, using gated RMS loudness estimate with 3 dB headroom",
                }
            )
        )
    except Exception as e:
        print(json.dumps({"stage": "warn", "message": f"loudness normalization failed: {e}"}))
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
