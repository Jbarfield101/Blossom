# Pattern Synthesizer

## RNG Seeding

Pattern generation uses deterministic random streams derived from a base seed. Use `_seeded_rng(seed, *streams)` to create independent generators for each stream (e.g., `_seeded_rng(seed, "key")` for key selection). Avoid module‑level RNG state; instead pass the generator to functions that need randomness so that outputs remain reproducible.
