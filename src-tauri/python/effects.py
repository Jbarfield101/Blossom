import numpy as np
from typing import List
from pydub import AudioSegment
from scipy.signal import butter, filtfilt, resample_poly

SR = 44100

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


def soft_clip_np(x: np.ndarray, drive: float = 1.0) -> np.ndarray:
    x = x * drive
    return x / (1.0 + np.abs(x))


def apply_soft_limit(audio: AudioSegment, drive: float = 1.02, oversample: int = 2) -> AudioSegment:
    samples = np.array(audio.get_array_of_samples()).astype(np.float32)
    channels = audio.channels
    if channels == 2:
        samples = samples.reshape((-1, 2))
    else:
        samples = samples.reshape((-1, 1))
    max_int = float(2 ** (8 * audio.sample_width - 1))
    x = samples / max_int
    if oversample > 1:
        x = resample_poly(x, oversample, 1, axis=0)
    y = soft_clip_np(x, drive=drive)
    if oversample > 1:
        y = resample_poly(y, 1, oversample, axis=0)
    y = np.clip(y * max_int, -max_int, max_int - 1).astype(
        np.int16 if audio.sample_width == 2 else samples.dtype
    )
    if channels == 2:
        y = y.reshape((-1,))
    return audio._spawn(y.tobytes())


def apply_tape_saturation(audio: AudioSegment, drive: float = 1.1, oversample: int = 2) -> AudioSegment:
    """Simple tape-style saturation with gentle high-frequency roll-off."""
    samples = np.array(audio.get_array_of_samples()).astype(np.float32)
    channels = audio.channels
    if channels == 2:
        samples = samples.reshape((-1, 2))
    else:
        samples = samples.reshape((-1, 1))
    max_int = float(2 ** (8 * audio.sample_width - 1))
    x = samples / max_int
    if oversample > 1:
        x = resample_poly(x, oversample, 1, axis=0)
    y = np.tanh(x * drive)
    if oversample > 1:
        y = resample_poly(y, 1, oversample, axis=0)
    for ch in range(channels):
        y[:, ch] = _butter_lowpass(y[:, ch], 12000)
    y = np.clip(y * max_int, -max_int, max_int - 1).astype(
        np.int16 if audio.sample_width == 2 else samples.dtype
    )
    if channels == 2:
        y = y.reshape((-1,))
    return audio._spawn(y.tobytes())


def apply_wow_flutter(
    audio: AudioSegment,
    rate_hz: float = 0.3,
    depth: float = 0.002,
    flutter_rate: float = 5.0,
    flutter_depth: float = 0.0005,
    rng=None,
) -> AudioSegment:
    """Apply wow/flutter pitch modulation to emulate analog tape."""
    if rng is not None:
        rate_hz = float(rng.uniform(0.2, 0.4))
        depth = float(rng.uniform(0.001, 0.003))
        flutter_rate = float(rng.uniform(4.0, 7.0))
        flutter_depth = float(rng.uniform(0.0001, 0.0005))

    samples = np.array(audio.get_array_of_samples()).astype(np.float32)
    channels = audio.channels
    if channels == 2:
        samples = samples.reshape((-1, 2))
    else:
        samples = samples.reshape((-1, 1))
    max_int = float(2 ** (8 * audio.sample_width - 1))
    x = samples / max_int
    n = x.shape[0]
    t = np.arange(n) / SR
    mod = depth * np.sin(2 * np.pi * rate_hz * t)
    mod += flutter_depth * np.sin(2 * np.pi * flutter_rate * t)
    idx = np.arange(n) + mod * SR
    idx = np.clip(idx, 0, n - 1)
    base = np.arange(n)
    y = np.zeros_like(x)
    for ch in range(channels):
        y[:, ch] = np.interp(idx, base, x[:, ch])
    y = np.clip(y * max_int, -max_int, max_int - 1).astype(
        np.int16 if audio.sample_width == 2 else samples.dtype
    )
    if channels == 2:
        y = y.reshape((-1,))
    return audio._spawn(y.tobytes())


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
    left = x + _shift_ms(hf, -0.9)
    right = x + _shift_ms(hf, 0.9)
    haas = np.stack([left, right], axis=-1)
    dry = np.stack([x, x], axis=-1)
    stereo = 0.75 * dry + 0.25 * haas
    return stereo.astype(np.float32)


def apply_chorus_np(
    x: np.ndarray,
    depth_ms: float = 8.0,
    rate_hz: float = 0.3,
    mix: float = 0.4,
    rng=None,
) -> np.ndarray:
    """Simple chorus using modulated delay line."""
    if mix <= 0:
        return x
    if rng is not None:
        depth_ms = float(rng.uniform(6.0, 10.0))
        rate_hz = float(rng.uniform(0.15, 0.35))
    n = len(x)
    t = np.arange(n) / SR
    lfo = np.sin(2 * np.pi * rate_hz * t)
    delay = (depth_ms / 1000.0) * SR * (lfo + 1.0) * 0.5
    idx = np.arange(n) - delay
    idx = np.clip(idx, 0, n - 1).astype(int)
    delayed = x[idx]
    y = (x + mix * delayed) / (1.0 + mix)
    return y.astype(np.float32)


def _apply_duck_envelope(
    buf: np.ndarray,
    positions_ms: List[float],
    depth_db=2.0,
    attack_ms=14,
    hold_ms=30,
    release_ms=180,
):
    if not positions_ms:
        return
    depth = 10 ** (-abs(depth_db) / 20.0)
    env = np.ones_like(buf, dtype=np.float32)
    a = int(SR * attack_ms / 1000.0)
    h = int(SR * hold_ms / 1000.0)
    r = int(SR * release_ms / 1000.0)
    one_minus = 1.0 - depth
    attack_curve = 1.0 - np.linspace(0, 1, a, endpoint=False, dtype=np.float32) * one_minus
    hold_curve = np.full(h, depth, dtype=np.float32)
    release_curve = depth + np.linspace(0, 1, r, endpoint=False, dtype=np.float32) * one_minus
    for pos in positions_ms:
        p = int(max(0, pos) * SR / 1000)
        j0 = p
        j1 = min(p + a, len(env))
        if j0 < len(env):
            env[j0:j1] = np.minimum(env[j0:j1], attack_curve[: j1 - j0])
        j0 = p + a
        j1 = min(j0 + h, len(env))
        if j0 < len(env):
            env[j0:j1] = np.minimum(env[j0:j1], hold_curve[: j1 - j0])
        j0 = p + a + h
        j1 = min(j0 + r, len(env))
        if j0 < len(env):
            env[j0:j1] = np.minimum(env[j0:j1], release_curve[: j1 - j0])
    buf *= env


def _schroeder_room(x: np.ndarray, mix=0.12, pre_ms=12, decay=0.35):
    if mix <= 0:
        return x

    def comb(sig, d_ms, fb):
        d = max(1, int(SR * d_ms / 1000.0))
        y = np.zeros_like(sig, dtype=np.float32)
        for i in range(len(sig)):
            y[i] = sig[i] + (y[i - d] * fb if i >= d else 0.0)
        return y

    def allpass(sig, d_ms, g):
        d = max(1, int(SR * d_ms / 1000.0))
        y = np.zeros_like(sig, dtype=np.float32)
        for i in range(len(sig)):
            xn = sig[i]
            xnd = sig[i - d] if i >= d else 0.0
            ynd = y[i - d] if i >= d else 0.0
            y[i] = -g * xn + xnd + g * ynd
        return y

    dry = x
    x = _shift_ms(x, pre_ms)
    wet = (
        comb(x, 29, decay * 0.70)
        + comb(x, 37, decay * 0.66)
        + comb(x, 41, decay * 0.62)
        + comb(x, 53, decay * 0.58)
    ) * 0.25
    wet = allpass(wet, 7, 0.65)
    wet = allpass(wet, 3, 0.70)
    return (1.0 - mix) * dry + mix * wet

