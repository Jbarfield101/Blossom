from __future__ import annotations

import asyncio
import json
import shutil
import uuid
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse

app = FastAPI()

JOBS_DIR = Path("/tmp/jobs")
STUB_WAV = Path(__file__).with_name("stub.wav")
JOBS_DIR.mkdir(parents=True, exist_ok=True)

# In-memory cache of job states
job_states: dict[str, dict[str, Any]] = {}


async def _process_job(job_id: str) -> None:
    """Simulate processing by sleeping and writing output files."""
    await asyncio.sleep(2)
    job_dir = JOBS_DIR / job_id
    status_path = job_dir / "status.json"
    output_path = job_dir / "output.wav"

    shutil.copyfile(STUB_WAV, output_path)
    status_path.write_text(json.dumps({"status": "done"}))

    job_states[job_id].update(
        {"status": "done", "progress": 100, "audio_url": f"/preview/{job_id}"}
    )


@app.post("/compose")
async def compose(request: Request, background_tasks: BackgroundTasks) -> dict[str, str]:
    data = await request.json()
    job_id = str(uuid.uuid4())
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    (job_dir / "input.json").write_text(json.dumps(data))
    job_states[job_id] = {"status": "queued", "progress": 0, "audio_url": None}

    background_tasks.add_task(_process_job, job_id)
    return {"job_id": job_id}


@app.get("/status/{job_id}")
async def get_status(job_id: str) -> dict[str, Any]:
    state = job_states.get(job_id)
    if state is None:
        job_dir = JOBS_DIR / job_id
        status_path = job_dir / "status.json"
        status = "queued"
        if status_path.exists():
            file_state = json.loads(status_path.read_text())
            status = file_state.get("status", "queued")
        progress = 100 if status == "done" else 0
        audio_url = f"/preview/{job_id}" if status == "done" else None
        state = {"status": status, "progress": progress, "audio_url": audio_url}
        job_states[job_id] = state
    return {"job_id": job_id, **state}


@app.get("/preview/{job_id}")
async def preview(job_id: str) -> FileResponse:
    job_dir = JOBS_DIR / job_id
    output_path = job_dir / "output.wav"
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Job output not found")
    return FileResponse(output_path, media_type="audio/wav", filename="output.wav")
