import argparse
import json
import io
import os
from typing import List

from pydub import AudioSegment
from gtts import gTTS

from lofi.renderer import render_from_spec
from lofi.io_utils import ensure_wav_bitdepth


def tempo_align(seg: AudioSegment, source_bpm: float, target_bpm: float) -> AudioSegment:
    if source_bpm <= 0 or target_bpm <= 0 or source_bpm == target_bpm:
        return seg
    ratio = target_bpm / source_bpm
    new_rate = int(seg.frame_rate * ratio)
    return seg._spawn(seg.raw_data, overrides={"frame_rate": new_rate}).set_frame_rate(seg.frame_rate)


def tts_audio(text: str) -> AudioSegment:
    tts = gTTS(text=text)
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    buf.seek(0)
    return AudioSegment.from_file(buf, format="mp3")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a DJ-style mix from multiple SongSpec JSON files.")
    parser.add_argument("--specs", nargs="+", required=True, help="Paths to song spec JSON files")
    parser.add_argument("--out", required=True, help="Output WAV path for the mix")
    parser.add_argument("--crossfade-ms", type=int, default=5000, help="Crossfade duration in ms")
    parser.add_argument("--host", action="store_true", help="Insert radio host voice intros")
    args = parser.parse_args()

    segments: List[AudioSegment] = []
    target_bpm = None

    if args.host:
        segments.append(tts_audio("Welcome back to Blossom Radio."))

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
            segments.append(tts_audio(intro))
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
