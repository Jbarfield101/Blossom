# Blossom

Blossom is a Tauri desktop application with a React front‑end and Python audio
rendering helpers.

## Prerequisites

Install the following tools before working with the project:

- **Rust** – required for the Tauri backend. Install via [rustup](https://rustup.rs/).
- **Node.js** – version 18 or later for the React/Vite front‑end.
- **Python** – version 3.10+ for audio scripts.
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

- **Uploading PDFs:** Use the D&D forms' upload dialogs to import rules, lore, or
  spells. Parsed entries appear in their respective lists once the background
  task finishes.
- **World inventory:** After NPCs are loaded, open the *World Inventory* page to
  see a consolidated list of items along with the NPCs that carry them.
- **Ollama enrichment:** Features such as General Chat and the NPC Maker start
  the local `ollama` model automatically. Ensure the `ollama` CLI is installed so
  enrichment requests succeed.

### Manual end‑to‑end test

1. Start the app with `npm run tauri dev`.
2. Visit *World Inventory* and verify items aggregate under their NPC owners.
3. Open General Chat and send a message to trigger `start_ollama`; check that a
   model response is received.

## RetroTV component

The `RetroTV` component renders its children inside a styled television frame when
the active theme is set to `retro`. If no children are provided, the component
automatically displays `/assets/logo.png` as a fallback.
When a user uploads a video, it plays automatically on an endless loop.
## Configuration and optional features

- **Paths:** ComfyUI is bundled and starts automatically, so no directory setup
  is required. The Python interpreter path is detected automatically but can be
  changed if needed.
- **Blender path:** If Blender is not on your system `PATH`, set the
  `BLENDER_PATH` environment variable to the Blender executable so `/objects/blender`
  can run scripts.

