import io

import numpy as np
import torch

try:
    from bark import SAMPLE_RATE, generate_audio, preload_models
except Exception as err:  # pragma: no cover - depends on optional package
    SAMPLE_RATE = 24_000
    generate_audio = None
    preload_models = None
    _import_error = err
else:
    _import_error = None


def _get_device() -> torch.device:
    """Return CUDA device when available, otherwise CPU."""
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def load_model() -> None:
    """Load Bark models onto the appropriate device."""
    if preload_models is None:
        raise RuntimeError("bark library is not installed") from _import_error
    preload_models(device=_get_device())


# Load models as soon as the module is imported.
load_model()


def speak(text: str, speaker: str) -> bytes:
    """Generate speech audio for ``text`` using the given ``speaker``.

    Parameters
    ----------
    text:
        The text to render.
    speaker:
        Speaker identifier or history prompt for Bark.

    Returns
    -------
    bytes
        WAV-encoded audio bytes.
    """
    if generate_audio is None:
        raise RuntimeError("bark library is not installed") from _import_error

    device = _get_device()
    audio_array: np.ndarray = generate_audio(text, history_prompt=speaker, device=device)

    buffer = io.BytesIO()
    import soundfile as sf  # imported lazily to keep module light

    sf.write(buffer, audio_array, SAMPLE_RATE, format="WAV")
    return buffer.getvalue()
