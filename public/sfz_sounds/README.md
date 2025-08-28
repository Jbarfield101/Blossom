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

Inside the `.sfz`, reference samples using paths relative to the `.sfz` file:

```
<region> sample=piano/C4.wav
```

## Loading

At runtime, resolve the path to an instrument using `resolveResource` and then
convert it to a URL with `convertFileSrc` before handing it to the loader:

```ts
const path = await resolveResource('sfz_sounds/piano.sfz');
loadSfz(convertFileSrc(path));
```

Because sample paths are relative, the loader automatically locates files inside
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
