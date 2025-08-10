# src-tauri/python/lofi_gpu.py
# ------------------------------------------------------------
# Generates a short lo‑fi clip and prints the output file path.
# Prefers GPU (CUDA) with Audiocraft's MusicGen; falls back to CPU
# or a simple sine wave if libraries are missing. Safe for first
# end‑to‑end wiring with Tauri.
# ------------------------------------------------------------

import argparse
import os
import sys
import time
import tempfile
import math
import wave
import contextlib

# Optional imports guarded inside functions so the script works even
# if torch / audiocraft / torchaudio / soundfile are not installed.
def _try_imports():
    mods = {}
    try:
        import torch  # type: ignore
        mods["torch"] = torch
    except Exception:
        mods["torch"] = None
    try:
        from audiocraft.models import musicgen  # type: ignore
        mods["musicgen"] = musicgen
    except Exception:
        mods["musicgen"] = None
    try:
        import torchaudio  # type: ignore
        mods["torchaudio"] = torchaudio
    except Exception:
        mods["torchaudio"] = None
    try:
        import soundfile as sf  # type: ignore
        mods["soundfile"] = sf
    except Exception:
        mods["soundfile"] = None
    try:
        import numpy as np  # type: ignore
        mods["np"] = np
    except Exception:
        mods["np"] = None
    return mods


def save_wav_from_tensor(waveform, sample_rate, out_path, mods):
    """
    Save a torch/numpy waveform as 16-bit PCM WAV to out_path.
    Supports torchaudio, soundfile, or pure stdlib wave+numpy fallback.
    """
    # waveform expected shape: (channels, samples) OR (1, samples)
    ta = mods.get("torchaudio")
    sf = mods.get("soundfile")
    np = mods.get("np")

    # Normalize to 2D float32 [-1, 1]
    try:
        import numpy as _np  # local import for fallback path too
        if "torch" in str(type(waveform)):
            # torch tensor
            waveform = waveform.detach().cpu().float()
            if waveform.dim() == 1:
                waveform = waveform.unsqueeze(0)
            data = waveform.numpy()
        else:
            # assume numpy
            data = _np.asarray(waveform, dtype=_np.float32)
            if data.ndim == 1:
                data = data[_np.newaxis, :]
    except Exception as e:
        raise RuntimeError(f"Failed to normalize waveform: {e}")

    # torchaudio path
    if ta is not None:
        try:
            import torch  # type: ignore
            tensor = torch.from_numpy(data)
            ta.save(out_path, tensor, sample_rate=sample_rate, encoding="PCM_S", bits_per_sample=16)
            return
        except Exception:
            pass

    # soundfile path
    if sf is not None:
        try:
            # soundfile expects shape (samples, channels)
            sf.write(out_path, data.T, samplerate=sample_rate, subtype="PCM_16")
            return
        except Exception:
            pass

    # pure stdlib wave path (requires numpy for int16 conversion)
    if np is None:
        raise RuntimeError("No torchaudio/soundfile/numpy available to save WAV.")

    # clamp and convert float [-1,1] -> int16
    data16 = (np.clip(data, -1.0, 1.0) * 32767.0).astype(np.int16)
    # interleave channels (C,S) -> (S,C)
    interleaved = data16.T.copy(order="C")

    with contextlib.closing(wave.open(out_path, "wb")) as w:
        nch = interleaved.shape[1] if interleaved.ndim == 2 else 1
        w.setnchannels(nch)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(interleaved.tobytes())


def generate_with_audiocraft(prompt: str, duration: int, seed: int, mods) -> tuple:
    torch = mods["torch"]
    musicgen = mods["musicgen"]
    if torch is None or musicgen is None:
        raise RuntimeError("Audiocraft or Torch not available.")

    device = "cuda" if torch.cuda.is_available() else "cpu"

    # set seed via torch (works across Audiocraft versions)
    torch.manual_seed(int(seed))
    if device == "cuda":
        torch.cuda.manual_seed_all(int(seed))

    model_name = os.environ.get("MUSICGEN_MODEL", "facebook/musicgen-small")
    model = musicgen.MusicGen.get_pretrained(model_name, device=device)

    # DO NOT pass seed here (your version doesn't support it)
    model.set_generation_params(
        duration=duration,
        use_sampling=True,
        top_k=250,
        top_p=0.0,
        temperature=1.0,
    )

    with torch.no_grad():
        # Some versions use descriptions=..., others accept a positional list.
        # The positional form is the most compatible:
        wavs = model.generate([prompt], progress=False)
        wav = wavs[0]  # tensor (channels, samples) or (1, samples)
        if wav.dim() == 1:
            wav = wav.unsqueeze(0)
        return wav.detach().cpu().float(), 32000




def generate_sine(duration: int, freq: float = 220.0, sr: int = 44100):
    """
    Last-resort fallback: generate a short sine tone.
    Returns (waveform as numpy float32 (1,S), sample_rate).
    """
    import numpy as np
    t = np.arange(0, duration, 1.0 / sr, dtype=np.float32)
    y = 0.15 * np.sin(2 * math.pi * freq * t)
    return y[np.newaxis, :], sr  # (1, samples)


def main():
    p = argparse.ArgumentParser(description="Lo‑Fi generator (GPU if available). Prints output path.")
    p.add_argument("--prompt", type=str, required=True, help="Text prompt for the music model.")
    p.add_argument("--duration", type=int, default=12, help="Clip length in seconds.")
    p.add_argument("--seed", type=int, default=0, help="Random seed for reproducibility.")
    args = p.parse_args()

    mods = _try_imports()
    out_path = os.path.join(tempfile.gettempdir(), f"blossom_lofi_{int(time.time())}.wav")

    # Try Audiocraft => else fallback to sine, with clear stderr logging
    try:
        if mods["torch"] is not None and mods["musicgen"] is not None:
            waveform, sr = generate_with_audiocraft(args.prompt, args.duration, args.seed, mods)
            sys.stderr.write("[lofi_gpu] MODE=AUDIOCRAFT\n")
        else:
            raise RuntimeError("Torch/Audiocraft not available")
    except Exception as e:
        sys.stderr.write(f"[lofi_gpu] MODE=SINE  reason={e}\n")
        waveform, sr = generate_sine(args.duration)

    try:
        save_wav_from_tensor(waveform, sr, out_path, mods)
    except Exception as e:
        print(f"Failed to save audio: {e}", file=sys.stderr)
        sys.exit(1)

    # IMPORTANT: print the file path (Tauri reads stdout)
    print(os.path.abspath(out_path))



if __name__ == "__main__":
    main()
