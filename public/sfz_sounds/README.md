# SFZ Sounds

Static SFZ instrument definitions and their samples live here. The folder is
served from `/sfz_sounds` at runtime so front-end code can fetch files by
relative URL.

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

Future code will load instruments from this directory using relative paths. When
invoking the loader, pass only the file name:

```ts
loadSfz('piano.sfz'); // resolves to /sfz_sounds/piano.sfz
```

Because sample paths are relative, the loader automatically locates files inside
the matching sample folder (`piano/` in this example).
