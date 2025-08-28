# SFZ Sounds

Static SFZ instrument definitions and their samples live here. When the app is
packaged with Tauri, this directory is bundled into the application's resource
folder and is resolved at runtime via Tauri's asset APIs.

## Naming and layout

- Name each instrument file `instrument-name.sfz` using lowercase letters and
  hyphens.
- Store the audio samples in a folder with the same base name next to the
  `.sfz` file.

Example structure:

```
public/sfz_sounds/
├── piano.sfz
└── piano/
    ├── C4.wav
    └── ...
```

Inside the `.sfz`, set a `default_path` for the samples and reference each file
by name:

```
<control> default_path=piano/

<region> sample=C4.wav
```

## Loading

At runtime, resolve the path to an instrument using `resolveResource` and then
convert it to a URL with `convertFileSrc` before handing it to the loader:

```ts
const path = await resolveResource('sfz_sounds/piano.sfz');
loadSfz(convertFileSrc(path));
```

Because `default_path` is used, the loader automatically locates files inside
the matching sample folder (`piano/` in this example).

## Using in song specs

Reference SFZ files in the song JSON to swap instruments:

```json
{
  "sfz_chords": "sfz_sounds/piano.sfz",
  "sfz_pads": "sfz_sounds/pads.sfz",
  "sfz_bass": "sfz_sounds/bass.sfz"
}
```

`sfz_instrument` remains available for lead melodies.

## Instruments

- UprightPianoKW – upright piano sample set by Kurt W., sourced from the
  musical-artifacts archive and released under the CC0 1.0 license.

## Sample formats

Tone.js works best with WAV or OGG samples for web playback. FLAC files are larger and may not decode reliably, even though browsers support them. Convert any FLAC samples to WAV using ffmpeg:

```
ffmpeg -i sample.flac -c:a pcm_s16le sample.wav
```

Update the `.sfz` file to reference the `.wav` files after conversion.

