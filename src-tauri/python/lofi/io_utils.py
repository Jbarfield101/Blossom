import os
import sys
import logging
from typing import Optional

import numpy as np
from pydub import AudioSegment
from pydub.utils import which

__all__ = ["set_ffmpeg_paths", "apply_dither", "ensure_wav_bitdepth"]

logger = logging.getLogger(__name__)


def set_ffmpeg_paths() -> None:
    """Configure pydub to find ffmpeg/ffprobe binaries."""
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
                logger.info({"stage": "info", "message": "ffmpeg set", "path": p})
                set_any = True
                break
        for p in candidates_ffprobe:
            if p and os.path.exists(p):
                AudioSegment.ffprobe = p
                logger.info({"stage": "info", "message": "ffprobe set", "path": p})
                break
    except (FileNotFoundError, OSError) as e:
        logger.error({"stage": "error", "message": f"ffmpeg configuration failed: {e}"})
        raise
    if not set_any:
        logger.error({"stage": "error", "message": "ffmpeg not found; please install ffmpeg and ensure it is on PATH"})
        raise RuntimeError("ffmpeg not found")


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


# Configure ffmpeg paths on import so pydub can locate binaries.
try:
    set_ffmpeg_paths()
except Exception:
    pass
