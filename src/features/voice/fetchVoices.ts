import presets from "./presets.json";

/**
 * Retrieve available Bark preset identifiers.
 * Attempts to fetch from Bark's online presets list, falling back to
 * a static JSON bundle when offline.
 */
export async function fetchVoices(): Promise<string[]> {
  try {
    const res = await fetch(
      "https://huggingface.co/suno/bark/raw/main/assets/presets.json"
    );
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      return Object.keys(data);
    }
  } catch {
    // ignore network errors and fall back to static list
  }
  return presets;
}

export default fetchVoices;
