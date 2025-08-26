# Agent Instructions

## SFZ Loader

The `sfzLoader` utility parses a minimal subset of the SFZ format and
creates a `Tone.Sampler` mapping from region definitions.

### Supported opcodes
- `sample` – path to the audio file. Paths are resolved relative to the SFZ file.
- `lokey`, `hikey`, `key` – MIDI note range or single key for the region.
- `pitch_keycenter` – used to derive the sample's root note.

Other opcodes are ignored. Only `<region>` blocks are handled; `<group>`,
`<control>`, and more advanced features such as velocity layers, envelopes,
and modulators are currently unsupported.

`loadSfz(path)` fetches the file, parses regions, and returns a ready
`Tone.Sampler`. Samples must be accessible from the browser environment.

