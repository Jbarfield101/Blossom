# Blossom

Blossom is a Tauri desktop application with a React front‑end and Python audio
rendering helpers.

## Prerequisites

Install the following tools before working with the project:

- **Rust** – required for the Tauri backend. Install via [rustup](https://rustup.rs/).
- **Node.js** – version 18 or later for the React/Vite front‑end.
- **Python** – version 3.10+ for audio scripts. Coqui TTS supports only
  Python 3.9–3.11, so use Python 3.10 or 3.11 for speech features. Python 3.13
  or later also requires the
  [`audioop-lts`](https://pypi.org/project/audioop-lts/) module.
- **FFmpeg** – used by the Python scripts for reading and writing audio. Ensure
  `ffmpeg` and `ffprobe` are available on your `PATH`. On macOS or Linux install
  via your package manager (for example `brew install ffmpeg` or `sudo apt install ffmpeg`).
  On Windows download a build from [ffmpeg.org](https://ffmpeg.org/download.html)
  and add its `bin` directory to your `PATH`.

## Installation

Install JavaScript and Python dependencies:

```bash
npm install
# create/activate a Python environment, then
pip install -r requirements.txt  # or: pip install .
```

`audioop-lts` is included in the requirements and will be installed automatically on
Python 3.13+ to replace the removed `audioop` module.

## Running the Tauri app

```bash
npm run tauri dev    # start the app in development mode
npm run tauri build  # build a release bundle
```

The Rust backend can launch local tools such as ComfyUI and Ollama. Set the
ComfyUI folder location in the app's Settings page and update the Python path in
`src-tauri/src/commands.rs` if needed:

```rust
fn conda_python() -> PathBuf {
    // Python interpreter to run the bundled scripts
    PathBuf::from(r"C:\\Users\\Owner\\.conda\\envs\\blossom-ml\\python.exe")
}
```

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

## Text-to-Speech (TTS) models

Blossom can announce track titles or host voice‑overs using the
[Coqui TTS](https://github.com/coqui-ai/TTS) library.

1. **Install the library**

   Coqui TTS requires Python 3.9–3.11.

   ```bash
   pip install TTS
   ```

2. **Download a model** – use `tts --list_models` to view available voices and
   download one. For example, to grab the English VITS model (≈500 MB):

   ```bash
    tts --model_name tts_models/en/vctk/vits --output_path ~/blossom_tts
   ```

   The download produces a `model.pth` and matching `config.json`. Store them in
   any directory. High‑quality multi‑speaker models can exceed 1 GB.

3. **Point the scripts to the model** – pass the path with `--tts-model-path`
   and the config alongside it:

   ```bash
   python src-tauri/python/dj_mix.py \
     --specs song1.json song2.json \
     --out mix.wav \
     --tts-model-path ~/blossom_tts/model.pth \
     --tts-config ~/blossom_tts/config.json
   ```

   You can also set the `TTS_MODEL_PATH` and `TTS_CONFIG_PATH` environment
   variables to avoid passing the arguments each time.

4. **GPU notes** – inference runs fastest on a modern NVIDIA GPU. A 16 GB card
   such as an RTX 4080 is recommended for real‑time speech; slower GPUs or CPU
   mode will work but take longer.


## Testing

Run the test suite to verify the application:

```bash
npm test
```

## Configuration and optional features

- **Alpha Vantage API key:** Set the `ALPHAVANTAGE_API_KEY` environment variable (or add
  `alphavantage_api_key` to `~/.blossom/config.json`) so the app can fetch stock
  news.
- **Paths:** Set the ComfyUI directory in the Settings page and edit
  `conda_python()` in `src-tauri/src/commands.rs` so the app can find your Python
  interpreter.
- **HQ feature flags:** `lofi/renderer.py` supports `hq_stereo`, `hq_reverb`,
  `hq_sidechain`, and `hq_chorus` flags inside the `motif` object to enable or disable
  high‑quality processing.
- **Limiter drive:** Add `limiter_drive` to the song JSON to control soft
  clipping intensity (values around `1.0` keep saturation subtle).
- **Chord span:** Control how long each chord lasts with `chord_span_beats`
  (2 = ½ bar, 4 = 1 bar, 8 = 2 bars).
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

