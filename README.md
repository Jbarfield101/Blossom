# Blossom

Blossom is a Tauri desktop application with a React front‑end and Python audio
rendering helpers.

## Prerequisites

Install the following tools before working with the project:

- **Rust** – required for the Tauri backend. Install via [rustup](https://rustup.rs/).
- **Node.js** – version 18 or later for the React/Vite front‑end.
- **Python** – version 3.10+ for audio scripts. Python 3.13 or later also
  requires the [`audioop-lts`](https://pypi.org/project/audioop-lts/) module.
- **FFmpeg** – used by the Python scripts for reading and writing audio. Ensure
  `ffmpeg` and `ffprobe` are available on your `PATH`. On macOS or Linux install
  via your package manager (for example `brew install ffmpeg` or `sudo apt install ffmpeg`).
  On Windows download a build from [ffmpeg.org](https://ffmpeg.org/download.html)
  and add its `bin` directory to your `PATH`.
- **Tesseract OCR** – required by `pytesseract` for image text recognition. Install
  the Tesseract engine with `brew install tesseract` on macOS or
  `sudo apt install tesseract-ocr` on Debian/Ubuntu. On Windows run
  `choco install tesseract` or download an installer and add it to your `PATH`.

## Installation

Install JavaScript and Python dependencies:

```bash
npm install
# create/activate a Python environment, then
pip install -r requirements.txt
```

`audioop-lts` is included in the requirements and will be installed automatically on
Python 3.13+ to replace the removed `audioop` module.

## Running the Tauri app

```bash
npm run tauri dev    # start the app in development mode
npm run tauri build  # build a release bundle
```

The Rust backend can launch local tools such as ComfyUI and Ollama. ComfyUI is
bundled and starts automatically without any folder configuration. Python is
detected automatically, and you can adjust the interpreter path from Settings if
needed.
Install the [`ollama`](https://github.com/ollama/ollama) CLI separately if you
plan to use the general chat features; the Python package is not required.

## Running Python scripts

Activate your Python environment first. The high‑quality generator lives at
`src-tauri/python/lofi/renderer.py`.

### FFmpeg for audio decoding

`renderer.py` uses [pydub](https://github.com/jiaaro/pydub) to decode audio, which
relies on the [FFmpeg](https://ffmpeg.org/) binaries. Install FFmpeg for your
platform and ensure `ffmpeg` and `ffprobe` are available on your `PATH`:

- **macOS**

  ```bash
  brew install ffmpeg
  ```

- **Debian/Ubuntu Linux**

  ```bash
  sudo apt update && sudo apt install ffmpeg
  ```

- **Windows**

  ```powershell
  choco install ffmpeg
  ```

  If not using Chocolatey, download a build from [ffmpeg.org](https://ffmpeg.org/download.html)
  and add its `bin` directory to your `PATH`.

After installation, verify the binaries are visible with `ffmpeg -version`.

## Testing

Install the Python test dependencies and run the test suites:

```bash
pip install -r requirements-dev.txt  # includes pytest
pytest  # run Python tests
npm test  # run JavaScript tests
```

## UI Usage

- **Uploading PDFs:** Use the D&D forms' PDF upload dialogs to import NPCs, rules,
  lore, or spells. Parsed entries appear in their respective lists once the
  background task finishes.
- **World inventory:** After NPCs are loaded, open the *World Inventory* page to
  see a consolidated list of items along with the NPCs that carry them.
- **Ollama enrichment:** Features such as General Chat and the NPC Maker start
  the local `ollama` model automatically. Ensure the `ollama` CLI is installed so
  enrichment requests succeed.

### Manual end‑to‑end test

1. Start the app with `npm run tauri dev`.
2. Upload an NPC PDF and confirm the character appears in the list.
3. Visit *World Inventory* and verify items aggregate under their NPC owners.
4. Open General Chat and send a message to trigger `start_ollama`; check that a
   model response is received.

## RetroTV component

The `RetroTV` component renders its children inside a styled television frame when
the active theme is set to `retro`. If no children are provided, the component
automatically displays `/assets/logo.png` as a fallback.
When a user uploads a video, it plays automatically on an endless loop.

## Configuration and optional features

- **Alpha Vantage API key:** Set the `ALPHAVANTAGE_API_KEY` environment variable (or add
  `alphavantage_api_key` to `~/.blossom/config.json`) so the app can fetch stock
  news.
- **Stock data provider:** Set `STOCKS_PROVIDER=twelvedata` and provide a
  `TWELVEDATA_API_KEY` to fetch quotes and time series from Twelve Data. The
  free tier allows up to 800 requests per day and 8 per minute.
- **Paths:** ComfyUI is bundled and starts automatically, so no directory needs
  to be configured. The Python interpreter path is detected automatically but
  can be changed there if needed.
- **Blender path:** If Blender is not on your system `PATH`, set the
  `BLENDER_PATH` environment variable to the Blender executable so `/objects/blender`
  can run scripts.
- **HQ feature flags:** `lofi/renderer.py` supports `hq_stereo`, `hq_reverb`,
  `hq_sidechain`, and `hq_chorus` flags inside the `motif` object to enable or disable
  high‑quality processing.
- **Limiter drive:** Add `limiter_drive` to the song JSON to control soft
  clipping intensity (values around `1.0` keep saturation subtle).
- **Chord span:** Control how long each chord lasts with `chord_span_beats`
  (2 = ½ bar, 4 = 1 bar, 8 = 2 bars).
- **SFZ instruments:** Supply custom samples in the song JSON with
  `sfz_instrument` for leads or `sfz_chords`, `sfz_pads`, and `sfz_bass` for
  chords, pads, and bass lines.
- **Song form:** Structure songs with through‑composed templates (e.g.
  `Intro–A–B–C–D–E–F–Outro`) and use odd bar lengths like 5 or 7 bars for
  asymmetrical phrases.
- **Analog polish:** Finishing chain adds tape-style saturation and subtle
  wow/flutter for vintage warmth.
- **Dithering:** Exported 16‑bit WAVs now include low-level triangular dither.
  Tune the noise floor with an optional `dither_amount` value in the song JSON
  (`1.0` for standard dithering, `0` to disable).
- **Presets:** Set `"preset": "Warm Cassette"`, `"Night Drive"`, `"Sunset VHS"`,
  `"Neon Palms"`, or `"Night Swim"` in your song JSON to load bundled settings
  from `src-tauri/python/presets.json`. Presets map HQ flags, limiter drive, and
  wow/flutter depth so you don't have to tweak raw parameters. Any value you
  specify in the song JSON overrides the preset. A new `"dreamy"` mood is also
  available.

