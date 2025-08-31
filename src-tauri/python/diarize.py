"""Speaker diarization with optional player enrollment.

This module wraps the ``pyannote.audio`` speaker diarization pipeline and
optionally maps diarized segments to known players using speaker
embeddings. Players can be "enrolled" by providing short audio clips that
represent their voices. Subsequent diarization runs will reuse the stored
embeddings to associate anonymous speaker labels with the enrolled
players.

The heavy ML dependencies are imported lazily so the module can be easily
mocked in unit tests.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import numpy as np

try:  # pragma: no cover - optional heavy dependency
    from pyannote.audio import Model, Pipeline  # type: ignore
except Exception:  # pragma: no cover
    Model = None  # type: ignore
    Pipeline = None  # type: ignore

EMBEDDING_MODEL = None  # type: ignore
PLAYER_EMBEDDINGS: Dict[str, np.ndarray] = {}


def _get_embedder():
    """Return a global embedding model instance."""

    global EMBEDDING_MODEL
    if EMBEDDING_MODEL is None:
        if Model is None:  # pragma: no cover - handled in tests
            raise RuntimeError("pyannote.audio is required for embeddings")
        EMBEDDING_MODEL = Model.from_pretrained("pyannote/embedding", device="cpu")
    return EMBEDDING_MODEL


def _compute_embedding(file: str, start: Optional[float] = None, end: Optional[float] = None) -> np.ndarray:
    """Compute an embedding for ``file`` optionally cropped to ``start``-``end``."""

    embedder = _get_embedder()
    embedding = embedder(file=file, start=start, end=end)
    return np.asarray(embedding)


def enroll_players(clips: Dict[str, List[str]]) -> None:
    """Enroll multiple players using sample ``clips``.

    ``clips`` maps player names to a list of audio file paths. An average
    embedding is computed per player and stored globally for later use.
    """

    for player, paths in clips.items():
        embeddings = [_compute_embedding(p) for p in paths]
        if embeddings:
            PLAYER_EMBEDDINGS[player] = np.mean(embeddings, axis=0)


def diarize(audio_path: str, enrollment_clips: Optional[Dict[str, List[str]]] = None) -> List[Dict[str, Any]]:
    """Diarize ``audio_path`` and map segments to enrolled players.

    Parameters
    ----------
    audio_path:
        Path to the audio file to process.
    enrollment_clips:
        Optional mapping of player name to a list of enrollment clips. When
        provided, these clips are used to update the global speaker
        embeddings before diarization.
    """

    if Pipeline is None:  # pragma: no cover - handled in tests
        raise RuntimeError("pyannote.audio is required")

    if enrollment_clips:
        enroll_players(enrollment_clips)

    pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization", device="cpu")
    diarization = pipeline(audio_path)

    segments: List[Dict[str, Any]] = []
    for segment, _, speaker in diarization.itertracks(yield_label=True):
        seg = {"start": float(segment.start), "end": float(segment.end), "speaker": speaker}
        if PLAYER_EMBEDDINGS:
            emb = _compute_embedding(audio_path, start=segment.start, end=segment.end)
            best_player: Optional[str] = None
            best_score = -1.0
            for player, ref in PLAYER_EMBEDDINGS.items():
                denom = np.linalg.norm(emb) * np.linalg.norm(ref)
                score = float(np.dot(emb, ref) / denom) if denom else -1.0
                if score > best_score:
                    best_player = player
                    best_score = score
            seg["player"] = best_player
        segments.append(seg)

    return segments
