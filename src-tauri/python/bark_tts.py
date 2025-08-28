"""Bark text-to-speech helper.

This module exposes a :func:`speak` function for programmatic use and can also
be executed as a script. When run directly it accepts ``--text`` and
``--speaker`` arguments and writes the generated WAV data to ``stdout``.
"""

import argparse
import io
import sys

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
    """Load Bark models, using the GPU when available."""
    if preload_models is None:
        raise RuntimeError("bark library is not installed") from _import_error
    import numpy
    import torch.serialization

    torch.serialization.add_safe_globals([
        (numpy._core.multiarray.scalar, 'numpy.core.multiarray.scalar'),
        numpy.dtype,
        numpy.dtypes.Float64DType,
    ])

    use_gpu = torch.cuda.is_available()
    preload_models(
        text_use_gpu=use_gpu,
        coarse_use_gpu=use_gpu,
        fine_use_gpu=use_gpu,
        codec_use_gpu=use_gpu,
    )


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

    audio_array: np.ndarray = generate_audio(text, history_prompt=speaker)

    buffer = io.BytesIO()
    import soundfile as sf  # imported lazily to keep module light

    sf.write(buffer, audio_array, SAMPLE_RATE, format="WAV")
    return buffer.getvalue()


def main() -> None:
    """Command-line interface for Bark TTS.

    Parses arguments and writes generated WAV data to ``stdout``.
    """

    parser = argparse.ArgumentParser(description="Generate speech with Bark")
    parser.add_argument("--text", required=True, help="Text to speak")
    parser.add_argument(
        "--speaker", required=True, help="Speaker identifier or history prompt"
    )
    args = parser.parse_args()

    audio = speak(args.text, args.speaker)
    sys.stdout.buffer.write(audio)


if __name__ == "__main__":  # pragma: no cover - CLI behaviour
    main()
