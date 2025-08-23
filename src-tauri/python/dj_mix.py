import argparse
import json
import os
from typing import List

import numpy as np
from pydub import AudioSegment
from TTS.api import TTS

from lofi.renderer import render_from_spec
from lofi.io_utils import ensure_wav_bitdepth


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
    parser = argparse.ArgumentParser(description="Generate a DJ-style mix from multiple SongSpec JSON files.")
    parser.add_argument("--specs", nargs="+", required=True, help="Paths to song spec JSON files")
    parser.add_argument("--out", required=True, help="Output WAV path for the mix")
    parser.add_argument("--crossfade-ms", type=int, default=5000, help="Crossfade duration in ms")
    parser.add_argument("--host", action="store_true", help="Insert radio host voice intros")
    parser.add_argument("--tts-model", required=True, help="Path to Coqui TTS model")
    parser.add_argument("--tts-config", required=True, help="Path to Coqui TTS config")
    parser.add_argument("--tts-speaker", help="Speaker ID for multi-speaker models")
    parser.add_argument("--tts-language", help="Language ID for multi-lingual models")
    args = parser.parse_args()

    segments: List[AudioSegment] = []
    target_bpm = None

    if args.host:
        segments.append(
            tts_audio(
                "Welcome back to Blossom Radio.",
                args.tts_model,
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
                    args.tts_model,
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
