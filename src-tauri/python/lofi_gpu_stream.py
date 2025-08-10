# src-tauri/python/lofi_gpu_stream.py
# Streams progress to stdout lines ("PROG <percent>") and prints
# "FILE <abs_path>" at the end. Works with GPU (AudioCraft/MusicGen)
# and falls back to a sine-wave if libs are missing.

import argparse, os, sys, time, tempfile, math, wave, contextlib

def _flush(line: str):
    print(line, flush=True)

def _try_imports():
    mods = {}
    try:
        import torch; mods["torch"] = torch
    except Exception: mods["torch"] = None
    try:
        from audiocraft.models import musicgen; mods["musicgen"] = musicgen
    except Exception: mods["musicgen"] = None
    try:
        import torchaudio; mods["torchaudio"] = torchaudio
    except Exception: mods["torchaudio"] = None
    try:
        import soundfile as sf; mods["soundfile"] = sf
    except Exception: mods["soundfile"] = None
    try:
        import numpy as np; mods["np"] = np
    except Exception: mods["np"] = None
    return mods

def _sine_chunk(seconds: int, sr: int = 44100, freq: float = 220.0):
    import numpy as np
    t = np.arange(0, seconds, 1.0 / sr, dtype=np.float32)
    y = 0.15 * np.sin(2 * math.pi * freq * t)
    return y[np.newaxis, :], sr  # (1, S)

def _save_wav(data, sample_rate, out_path, mods):
    ta, sf, np = mods.get("torchaudio"), mods.get("soundfile"), mods.get("np")

    # normalize to numpy float32 (C, S)
    if "torch" in str(type(data)):
        data = data.detach().cpu().float()
        if data.dim() == 1: data = data.unsqueeze(0)
        data = data.numpy()
    else:
        import numpy as _np
        data = _np.asarray(data, dtype=_np.float32)
        if data.ndim == 1: data = data[_np.newaxis, :]

    if ta is not None:
        try:
            import torch
            ta.save(out_path, torch.from_numpy(data), sample_rate=sample_rate,
                    encoding="PCM_S", bits_per_sample=16)
            return
        except Exception:
            pass

    if sf is not None:
        try:
            sf.write(out_path, data.T, samplerate=sample_rate, subtype="PCM_16")
            return
        except Exception:
            pass

    if np is None: raise RuntimeError("No writer available (torchaudio/soundfile/numpy).")
    data16 = (np.clip(data, -1, 1) * 32767.0).astype(np.int16)
    inter = data16.T.copy(order="C")
    with contextlib.closing(wave.open(out_path, "wb")) as w:
        nch = inter.shape[1] if inter.ndim == 2 else 1
        w.setnchannels(nch); w.setsampwidth(2); w.setframerate(sample_rate)
        w.writeframes(inter.tobytes())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--total-seconds", type=int, default=120)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--chunk", type=int, default=8)
    ap.add_argument("--bpm", type=int, default=0)      # optional flavor
    ap.add_argument("--style", type=str, default="")   # optional flavor
    args = ap.parse_args()

    mods = _try_imports()
    torch, musicgen = mods["torch"], mods["musicgen"]

    total = max(1, args.total_seconds)
    chunk = max(1, min(args.chunk, total))

    out_path = os.path.join(tempfile.gettempdir(), f"blossom_lofi_{int(time.time())}.wav")

    use_ac = torch is not None and musicgen is not None
    model = None
    sr = 32000

    aug_prompt = args.prompt
    if args.bpm:   aug_prompt = f"{aug_prompt}, {args.bpm} BPM"
    if args.style: aug_prompt = f"{aug_prompt}, {args.style}"

    if use_ac:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        torch.manual_seed(int(args.seed))
        if device == "cuda": torch.cuda.manual_seed_all(int(args.seed))
        name = os.environ.get("MUSICGEN_MODEL", "facebook/musicgen-small")
        model = musicgen.MusicGen.get_pretrained(name, device=device)
        # older AudioCraft takes duration only (no seed kw here)
        model.set_generation_params(duration=chunk, use_sampling=True, top_k=250, top_p=0.0, temperature=1.0)

    parts = []
    made = 0
    import numpy as np

    while made < total:
        this = min(chunk, total - made)
        try:
            if use_ac:
                with torch.no_grad():
                    w = model.generate([aug_prompt], progress=False)[0]
                    if w.dim() == 1: w = w.unsqueeze(0)
                    parts.append(w.detach().cpu().float().numpy())
                    sr = 32000
            else:
                w, sr = _sine_chunk(this)
                parts.append(w)
        except Exception:
            w, sr = _sine_chunk(this)
            parts.append(w)

        made += this
        _flush(f"PROG {int(made * 100 / total)}")

    data = np.concatenate(parts, axis=1)  # (C, S_total)
    _save_wav(data, sr, out_path, mods)

    _flush(f"FILE {os.path.abspath(out_path)}")

if __name__ == "__main__":
    main()
