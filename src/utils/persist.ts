// Utility functions to persist application state either to
// localStorage or a backend endpoint.
// When a backend URL is provided the state is sent via fetch.
// Otherwise it falls back to localStorage.

export async function saveState<T>(
  key: string,
  state: T,
  backendUrl?: string
): Promise<boolean> {
  const serialized = JSON.stringify(state);
  if (backendUrl) {
    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, state }),
      });
      if (!response.ok) {
        console.error(
          `Failed to save state: ${response.status} ${response.statusText}`
        );
        return false;
      }
      return true;
    } catch (err) {
      console.error("Failed to save state", err);
      return false;
    }
  } else {
    try {
      window.localStorage.setItem(key, serialized);
      const stored = window.localStorage.getItem(key);
      return stored === serialized;
    } catch (err) {
      console.error("Failed to save state", err);
      return false;
    }
  }
}

export async function loadState<T>(
  key: string,
  backendUrl?: string
): Promise<T | null> {
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}?key=${encodeURIComponent(key)}`);
      if (!res.ok) {
        console.error(`Failed to load state: ${res.status} ${res.statusText}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (err) {
      console.error("Failed to load state", err);
      return null;
    }
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

