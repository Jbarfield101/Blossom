"""Minimal Higgs TTS wrapper.

This script exposes a command line interface around the Higgs audio model.
It accepts text input and an optional reference audio sample to control the
speaker characteristics. Generated audio is written as a WAV file to stdout.
"""

from __future__ import annotations

import argparse
import os
import sys
from io import BytesIO
from typing import Dict, Optional

MODEL_PATH = os.environ.get("HIGGS_MODEL_PATH", "HIGGS_MODEL_PATH")
AUDIO_TOKENIZER_PATH = os.environ.get("HIGGS_AUDIO_TOKENIZER_PATH", "HIGGS_AUDIO_TOKENIZER_PATH")

# Example built-in voices. These point to example audio files that may be
# distributed separately. Users can supply a path directly via --speaker (or
# --ref_audio for backwards compatibility).
EXAMPLE_VOICES: Dict[str, str] = {
    "belinda": os.path.join(os.path.dirname(__file__), "samples", "belinda.wav"),
}


def resolve_ref_audio(ref_audio: Optional[str]) -> Optional[str]:
    """Return the resolved audio path for a reference voice.

    Parameters
    ----------
    ref_audio:
        Either a key from :data:`EXAMPLE_VOICES` or a file path.
    """

    if not ref_audio:
        return None

    path = EXAMPLE_VOICES.get(ref_audio, ref_audio)
    if not os.path.exists(path):
        raise FileNotFoundError(f"reference audio not found: {path}")
    return path


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Generate speech with Higgs TTS")
    parser.add_argument("--text", required=True, help="Text to synthesize")
    parser.add_argument(
        "--speaker",
        "--ref_audio",
        dest="speaker",
        help="Voice name (e.g. 'belinda') or path to reference audio",
    )
    args = parser.parse_args(argv)

    import torch
    import torchaudio
    from higgs.data_types import AudioContent, ChatMLSample, Message, TextContent
    from higgs.serve.serve_engine import HiggsAudioServeEngine

    device = "cuda" if torch.cuda.is_available() else "cpu"
    engine = HiggsAudioServeEngine(MODEL_PATH, AUDIO_TOKENIZER_PATH, device=device)

    ref_audio_path = resolve_ref_audio(args.speaker)
    contents = []
    if ref_audio_path is not None:
        contents.append(AudioContent(audio_url=ref_audio_path))
    contents.append(TextContent(text=args.text))
    sample = ChatMLSample(messages=[Message(role="user", content=contents)])

    response = engine.generate(sample, max_new_tokens=4096, force_audio_gen=True)
    if response.audio is None or response.sampling_rate is None:
        print("no audio generated", file=sys.stderr)
        return 1

    audio_tensor = torch.tensor(response.audio).unsqueeze(0)
    buffer = BytesIO()
    torchaudio.save(buffer, audio_tensor, response.sampling_rate, format="wav")
    sys.stdout.buffer.write(buffer.getvalue())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
