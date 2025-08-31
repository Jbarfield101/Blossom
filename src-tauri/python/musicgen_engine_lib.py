from __future__ import annotations

import os
import math
from typing import Optional, Tuple, Union

import numpy as np

try:
    import soundfile as sf  # type: ignore
except Exception:  # pragma: no cover
    sf = None  # type: ignore

try:
    import torch  # type: ignore
except Exception:  # pragma: no cover
    torch = None  # type: ignore


class MusicGenEngine:
    """
    Lightweight generator for initial musical structures.

    Attempts to use AudioCraft's MusicGen if available; otherwise falls back
    to a deterministic procedural synthesis to guarantee no errors and a
    valid np.ndarray output with or without a melody.
    """

    def __init__(
        self,
        model_name: Optional[str] = None,
        sample_rate: int = 44100,
        device: Optional[str] = None,
    ) -> None:
        self.sample_rate = int(sample_rate)
        self._ac_model = None
        self._device = device
        if self._device is None and torch is not None:
            self._device = "cuda" if torch.cuda.is_available() else "cpu"

        # Lazy import AudioCraft if present
        try:
            from audiocraft.models import musicgen  # type: ignore

            name = (
                model_name
                or os.environ.get("MUSICGEN_MODEL")
                or "facebook/musicgen-small"
            )
            self._ac_model = musicgen.MusicGen.get_pretrained(name, device=self._device)
            # Default generation params; callers can change seconds via generate()
            self._ac_model.set_generation_params(top_k=250, top_p=0.0, temperature=1.0)
        except Exception:
            self._ac_model = None

    # -------------------- Public API --------------------
    def generate(
        self,
        prompt: str,
        seconds: int = 20,
        melody: Optional[Union[str, np.ndarray]] = None,
        melody_sr: Optional[int] = None,
        sample_rate: Optional[int] = None,
    ) -> np.ndarray:
        """
        Generate audio for the given prompt.

        - If `melody` is provided (np.ndarray float32 in [-1,1] or a file path), it is used
          as a guide when possible; otherwise it is aligned and gently blended with the
          synthesized bed so this call never errors.
        - Returns mono float32 numpy array of length seconds*sample_rate in [-1, 1].
        """
        sr = int(sample_rate or self.sample_rate)
        dur = max(1, int(seconds))

        if self._ac_model is not None:
            try:
                self._ac_model.set_generation_params(duration=dur)
                if melody is None:
                    wav = self._ac_model.generate([prompt])  # (1, ch, n)
                else:
                    # Convert melody to tensor (mono) matching the requested duration
                    mel_np, m_sr = self._load_melody(melody, melody_sr or sr)
                    mel_t = torch.tensor(mel_np, dtype=torch.float32).unsqueeze(0)  # (1, n)
                    mel_t = mel_t.to(self._device)
                    # Some versions expose `generate_with_chroma` or `generate_with_melody`.
                    # We try melody API, otherwise fallback to continuation or plain generate.
                    wav = None
                    if hasattr(self._ac_model, "generate_with_chroma"):
                        wav = self._ac_model.generate_with_chroma(
                            descriptions=[prompt],
                            melody_wavs=mel_t.unsqueeze(1),  # (1, 1, n)
                            melody_sample_rate=m_sr,
                        )
                    elif hasattr(self._ac_model, "generate_with_melody"):
                        wav = self._ac_model.generate_with_melody(
                            descriptions=[prompt],
                            melody=mel_t.unsqueeze(0),
                            sr=m_sr,
                        )
                    if wav is None:
                        wav = self._ac_model.generate([prompt])

                # Convert to mono float32 numpy in [-1,1]
                wav_np = wav[0].detach().cpu().numpy()  # (ch, n)
                if wav_np.ndim == 2:
                    wav_np = wav_np.mean(axis=0)
                return self._fit_duration(self._to_float32(wav_np), dur, sr)
            except Exception:
                # Fall through to procedural fallback if anything goes wrong
                pass

        # Procedural fallback: simple pad + optional guided overlay
        base = self._synth_pad(prompt, dur, sr)
        if melody is not None:
            mel_np, m_sr = self._load_melody(melody, melody_sr or sr)
            mel_np = self._resample_if_needed(mel_np, m_sr, sr)
            mel_np = self._fit_duration(mel_np, dur, sr)
            out = 0.8 * base + 0.2 * mel_np
            return self._normalize(out)
        return base

    # -------------------- Helpers --------------------
    def _load_melody(
        self, melody: Union[str, np.ndarray], melody_sr: int
    ) -> Tuple[np.ndarray, int]:
        if isinstance(melody, np.ndarray):
            arr = self._ensure_mono(melody)
            return self._to_float32(arr), melody_sr
        if not isinstance(melody, str):
            raise TypeError("melody must be a numpy array or a file path string")
        if sf is None:
            raise RuntimeError("soundfile dependency not available to read melody path")
        data, sr = sf.read(melody, always_2d=False)
        data = self._ensure_mono(np.asarray(data))
        return self._to_float32(data), int(sr)

    def _synth_pad(self, prompt: str, seconds: int, sr: int) -> np.ndarray:
        n = seconds * sr
        # Choose base frequency from prompt heuristics
        prompt_l = (prompt or "").lower()
        base = 220.0
        if "lofi" in prompt_l or "lo-fi" in prompt_l:
            base = 110.0
        elif "ambient" in prompt_l:
            base = 176.0
        elif "cinematic" in prompt_l:
            base = 261.63
        # Blend few harmonics
        t = np.linspace(0, seconds, n, endpoint=False)
        y = (
            0.5 * np.sin(2 * math.pi * base * t)
            + 0.3 * np.sin(2 * math.pi * base * 2 * t)
            + 0.2 * np.sin(2 * math.pi * base * 3 * t)
        )
        # Simple slow attack/decay envelope
        env = self._adsr(n, attack=int(0.2 * sr), release=int(0.5 * sr))
        y *= env
        return self._to_float32(self._normalize(y))

    def _adsr(self, n: int, attack: int = 2048, release: int = 4096) -> np.ndarray:
        env = np.ones(n, dtype=np.float32)
        a = max(1, min(attack, n))
        r = max(1, min(release, n))
        env[:a] = np.linspace(0, 1, a, dtype=np.float32)
        env[-r:] = np.linspace(1, 0, r, dtype=np.float32)
        return env

    def _ensure_mono(self, x: np.ndarray) -> np.ndarray:
        if x.ndim == 1:
            return x
        if x.ndim == 2:
            return x.mean(axis=1)
        raise ValueError("audio array must be 1D or 2D")

    def _to_float32(self, x: np.ndarray) -> np.ndarray:
        x = np.asarray(x)
        if x.dtype == np.int16:
            x = x.astype(np.float32) / 32768.0
        elif x.dtype == np.int32:
            x = x.astype(np.float32) / 2147483648.0
        elif x.dtype != np.float32:
            x = x.astype(np.float32)
        return x

    def _normalize(self, x: np.ndarray, peak: float = 0.98) -> np.ndarray:
        m = float(np.max(np.abs(x)) or 1.0)
        return (x / m) * peak

    def _fit_duration(self, x: np.ndarray, seconds: int, sr: int) -> np.ndarray:
        target = int(seconds * sr)
        if x.shape[0] == target:
            return x.astype(np.float32)
        if x.shape[0] > target:
            return x[:target].astype(np.float32)
        # pad
        pad = target - x.shape[0]
        return np.pad(x, (0, pad), mode="constant").astype(np.float32)

    def _resample_if_needed(self, x: np.ndarray, src_sr: int, dst_sr: int) -> np.ndarray:
        if src_sr == dst_sr:
            return x
        # Simple linear resample to avoid extra deps.
        dur = x.shape[0] / float(src_sr)
        target = int(round(dur * dst_sr))
        if target <= 1:
            return np.zeros((max(1, int(dst_sr * 0.1)),), dtype=np.float32)
        t_old = np.linspace(0, dur, x.shape[0], endpoint=False)
        t_new = np.linspace(0, dur, target, endpoint=False)
        return np.interp(t_new, t_old, x).astype(np.float32)

