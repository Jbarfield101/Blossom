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

Tone.js works best with WAV or OGG samples for web playback. Chromium and Firefox can decode FLAC through Web Audio, but Safari support is limited, so converting to WAV or OGG improves compatibility and file size. Use the helper script to convert all FLAC samples to WAV and update `.sfz` references:

```
npm run sfz:flac2wav -- --bits 24
```

The `--bits` option accepts `16`, `24`, or `32` (default) to control output depth.

For a smaller footprint, convert FLAC directly to OGG:

```
ffmpeg -i in.flac -c:a libvorbis out.ogg
```

After adding or converting samples, run `npm run sfz:verify` to ensure `.sfz` files reference existing samples.

