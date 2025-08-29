"""Generate audio from an SFZ instrument given a JSON spec."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import List

import numpy as np
import soundfile as sf
from mido import MidiFile

from lofi.dsp import SR
from lofi.renderer import SfzSampler

NOTE_OFFSETS = {
    "C": 0,
    "C#": 1,
    "DB": 1,
    "D": 2,
    "D#": 3,
    "EB": 3,
    "E": 4,
    "F": 5,
    "F#": 6,
    "GB": 6,
    "G": 7,
    "G#": 8,
    "AB": 8,
    "A": 9,
    "A#": 10,
    "BB": 10,
    "B": 11,
}


def note_to_midi(note: str) -> int:
    name = note.strip().upper()
    if not name:
        raise ValueError("empty note name")
    octave = 4
    if name[-1].isdigit():
        octave = int(name[-1])
        name = name[:-1]
    if name not in NOTE_OFFSETS:
        raise ValueError(f"unknown note name '{note}'")
    return 12 * (octave + 1) + NOTE_OFFSETS[name]


def midi_to_freq(m: int) -> float:
    return 440.0 * 2 ** ((m - 69) / 12.0)


def build_default_sequence(key: str) -> List[float]:
    root = note_to_midi(key)
    intervals = [0, 2, 4, 5, 7, 9, 11, 12]  # major scale
    return [midi_to_freq(root + i) for i in intervals]


def notes_from_midi(midi_path: str) -> List[float]:
    mid = MidiFile(midi_path)
    notes: List[float] = []
    for msg in mid:
        if msg.type == "note_on" and msg.velocity > 0:
            notes.append(midi_to_freq(msg.note))
    return notes


def render_spec(spec: dict, out_override: str | Path | None = None) -> None:
    try:
        sfz_path = spec["sfz_path"]
        key = spec["key"]
        bpm = float(spec["bpm"])
        out_path = Path(out_override) if out_override else Path(spec["out"])
        midi_file = spec.get("midi_file")
    except KeyError as e:
        raise ValueError(f"missing field: {e}") from e

    sampler = SfzSampler.from_file(sfz_path)
    ms_per_note = 60000.0 / bpm

    if midi_file:
        notes = notes_from_midi(midi_file)
        if not notes:
            raise ValueError("no note_on events found in MIDI file")
    else:
        notes = build_default_sequence(key)

    buffers = [sampler.render(freq, ms_per_note) for freq in notes]
    audio = np.concatenate(buffers) if buffers else np.array([], dtype=np.float32)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out_path, audio, SR)


def render_from_spec(spec_path: str, out_override: str | Path | None = None) -> None:
    with open(spec_path) as f:
        spec = json.load(f)
    render_spec(spec, out_override)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Render a basic SFZ instrument performance from JSON spec"
    )
    parser.add_argument("spec", nargs="?", help="Path to JSON spec file")
    parser.add_argument(
        "--spec-json", help="JSON string with spec; overrides file input"
    )
    parser.add_argument(
        "--out", help="Output WAV path; overrides the spec's 'out' field"
    )
    args = parser.parse_args()
    try:
        if args.spec_json:
            spec = json.loads(args.spec_json)
            render_spec(spec, args.out)
        else:
            if not args.spec:
                parser.error(
                    "spec file path required when --spec-json is not provided"
                )
            render_from_spec(args.spec, args.out)
    except Exception as e:  # pragma: no cover - CLI guard
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
