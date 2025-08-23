import argparse
import json
import os
from typing import List

import numpy as np
from pydub import AudioSegment
from TTS.api import TTS

from lofi.renderer import render_from_spec
from lofi.io_utils import ensure_wav_bitdepth


def _load_config() -> dict:
    """Load configuration defaults for the CLI.

    Search order:
    1. Path specified by the ``DJ_MIX_CONFIG`` environment variable.
    2. ``~/.config/dj_mix.json`` in the user's home directory.
    3. ``dj_mix_config.json`` next to this script.
    """

    candidates = [
        os.environ.get("DJ_MIX_CONFIG"),
        os.path.expanduser("~/.config/dj_mix.json"),
        os.path.join(os.path.dirname(__file__), "dj_mix_config.json"),
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            try:
                with open(path) as f:
                    return json.load(f)
            except Exception:
                return {}
    return {}


def tempo_align(seg: AudioSegment, source_bpm: float, target_bpm: float) -> AudioSegment:
    if source_bpm <= 0 or target_bpm <= 0 or source_bpm == target_bpm:
        return seg
    ratio = target_bpm / source_bpm
    new_rate = int(seg.frame_rate * ratio)
    return seg._spawn(seg.raw_data, overrides={"frame_rate": new_rate}).set_frame_rate(seg.frame_rate)


def tts_audio(
    text: str,
    model_path: str,
    config_path: str,
    speaker: str | None = None,
    language: str | None = None,
) -> AudioSegment:
    """Synthesize *text* using a Coqui TTS model.

    Parameters
    ----------
    text: str
        The text to synthesize.
    model_path: str
        Path to the trained model file.
    config_path: str
        Path to the model configuration JSON.
    speaker: str | None
        Optional speaker identifier for multi-speaker models.
    language: str | None
        Optional language identifier for multi-lingual models.

    Returns
    -------
    AudioSegment
        The generated speech as a 16-bit PCM audio segment.
    """

    tts = TTS(model_path=model_path, config_path=config_path)
    wav = tts.tts(text=text, speaker=speaker, language=language)

    audio = np.array(wav)
    # Normalize to int16 range and build AudioSegment.
    audio = (audio / np.max(np.abs(audio)) * (2**15 - 1)).astype(np.int16)
    return AudioSegment(
        audio.tobytes(),
        frame_rate=tts.synthesizer.output_sample_rate,
        sample_width=2,
        channels=1,
    )


def main() -> None:
    config = _load_config()

    default_model = os.environ.get("TTS_MODEL_PATH") or config.get("tts_model_path")
    default_config = os.environ.get("TTS_CONFIG_PATH") or config.get("tts_config_path")
    default_speaker = os.environ.get("TTS_SPEAKER") or config.get("tts_speaker")
    default_language = os.environ.get("TTS_LANGUAGE") or config.get("tts_language")

    parser = argparse.ArgumentParser(
        description="Generate a DJ-style mix from multiple SongSpec JSON files."
    )
    parser.add_argument(
        "--specs", nargs="+", required=True, help="Paths to song spec JSON files"
    )
    parser.add_argument("--out", required=True, help="Output WAV path for the mix")
    parser.add_argument(
        "--crossfade-ms", type=int, default=5000, help="Crossfade duration in ms"
    )
    parser.add_argument(
        "--host", action="store_true", help="Insert radio host voice intros"
    )
    parser.add_argument(
        "--tts-model-path",
        "--tts-model",
        dest="tts_model_path",
        default=default_model,
        help="Path to Coqui TTS model",
    )
    parser.add_argument(
        "--tts-config",
        default=default_config,
        help="Path to Coqui TTS config",
    )
    parser.add_argument(
        "--tts-speaker",
        default=default_speaker,
        help="Speaker ID for multi-speaker models",
    )
    parser.add_argument(
        "--tts-language",
        default=default_language,
        help="Language ID for multi-lingual models",
    )
    args = parser.parse_args()

    if not args.tts_model_path or not args.tts_config:
        parser.error(
            "TTS model path and config are required. Provide via CLI, env vars, or config file."
        )

    segments: List[AudioSegment] = []
    target_bpm = None

    if args.host:
        segments.append(
            tts_audio(
                "Welcome back to Blossom Radio.",
                args.tts_model_path,
                args.tts_config,
                args.tts_speaker,
                args.tts_language,
            )
        )

    for idx, path in enumerate(args.specs):
        with open(path) as f:
            spec = json.load(f)
        song, bpm = render_from_spec(spec)
        if target_bpm is None:
            target_bpm = bpm
        else:
            song = tempo_align(song, bpm, target_bpm)
        if args.host:
            intro = spec.get("intro") or f"Now playing track {idx + 1}."
            segments.append(
                tts_audio(
                    intro,
                    args.tts_model_path,
                    args.tts_config,
                    args.tts_speaker,
                    args.tts_language,
                )
            )
        segments.append(song)

    if not segments:
        mix = AudioSegment.silent(duration=1000)
    else:
        mix = segments[0]
        for seg in segments[1:]:
            mix = mix.append(seg, crossfade=args.crossfade_ms)

    mix = ensure_wav_bitdepth(mix)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    mix.export(args.out, format="wav", parameters=["-acodec", "pcm_s16le"])


if __name__ == "__main__":
    main()
