# Blossom

Blossom is a Tauri desktop application with a React front‑end and Python audio
rendering helpers.

## Prerequisites

Install the following tools before working with the project:

- **Rust** – required for the Tauri backend. Install via [rustup](https://rustup.rs/).
- **Node.js** – version 18 or later for the React/Vite front‑end.
- **Python** – version 3.10+ for audio scripts.
- **FFmpeg** – used by the Python scripts for reading and writing audio. Ensure
  `ffmpeg` is available on your `PATH`.

## Installation

Install JavaScript and Python dependencies:

```bash
npm install
# create/activate a Python environment, then
pip install -r requirements.txt  # or: pip install .
```

## Running the Tauri app

```bash
npm run tauri dev    # start the app in development mode
npm run tauri build  # build a release bundle
```

The Rust backend can launch local tools such as ComfyUI and Ollama. Update the
paths in `src-tauri/src/commands.rs` to match your environment:

```rust
fn comfy_dir() -> PathBuf {
    // Path to your ComfyUI repository
    PathBuf::from(r"C:\\Comfy\\ComfyUI")
}

fn conda_python() -> PathBuf {
    // Python interpreter to run the bundled scripts
    PathBuf::from(r"C:\\Users\\Owner\\.conda\\envs\\blossom-ml\\python.exe")
}
```

## Running Python scripts

Activate your Python environment first.

### Stand‑alone song renderer

Generates a complete track from a JSON specification:

```bash
python src-tauri/python/lofi_gpu.py --song-json '{"bpm":80,"seed":123}' --out output.wav
```

`lofi_gpu_hq.py` adds optional feature flags inside the JSON `motif` object:

```json
{
  "hq_stereo": true,
  "hq_reverb": true,
  "hq_sidechain": true
}
```

### Streaming generator

`lofi_gpu_stream.py` streams progress to stdout and prints the final file path:

```bash
python src-tauri/python/lofi_gpu_stream.py --prompt "lofi beat" --total-seconds 30
```

Set the `MUSICGEN_MODEL` environment variable to choose an AudioCraft model for
GPU generation. The script falls back to a simple sine wave if the required
libraries are missing.

## Configuration and optional features

- **Paths:** Edit `comfy_dir()` and `conda_python()` in `src-tauri/src/commands.rs`
  so the app can find ComfyUI and your Python interpreter.
- **HQ feature flags:** `lofi_gpu_hq.py` supports `hq_stereo`, `hq_reverb`, and
  `hq_sidechain` flags inside the `motif` object to enable or disable
  high‑quality processing.
- **Streaming model:** `lofi_gpu_stream.py` accepts `--chunk`, `--bpm`,
  `--style`, and `--seed` options and prints `PROG <percent>` while generating.

