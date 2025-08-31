// AI MusicGen shell runners for Blossom
// Uses Tauri v2 shell plugin
// Import the shell plugin lazily so plain web dev doesn't require it.
// This avoids Vite failing when running `npm run dev` without the Tauri context.
let _Command: any | null = null;
type Child = any;
async function getCommand() {
  if (_Command) return _Command;
  try {
    const mod = await import('@tauri-apps/plugin-shell');
    _Command = mod.Command;
    return _Command;
  } catch (e) {
    throw new Error('Shell plugin not available. Run the desktop app: npm run tauri dev, and ensure @tauri-apps/plugin-shell is installed.');
  }
}

interface ExecOut {
  stdout: string | Uint8Array;
  stderr: string | Uint8Array;
  code?: number | null;
  signal?: number | null;
}

export async function runMusicGenText(prompt: string, seconds = 20): Promise<string> {
  const Command = await getCommand();
  const cmd = Command.create('musicgen-text', [
    'src-tauri/python/musicgen_engine.py',
    'text',
    prompt,
    String(seconds),
  ]);
  const out = (await cmd.execute()) as ExecOut;
  const stdout = typeof out.stdout === 'string' ? out.stdout : '';
  return stdout.trim();
}

export async function runMusicGenMelody(
  prompt: string,
  melodyPath: string,
  seconds = 20,
): Promise<string> {
  const Command = await getCommand();
  const cmd = Command.create('musicgen-melody', [
    'src-tauri/python/musicgen_engine.py',
    'melody',
    prompt,
    melodyPath,
    String(seconds),
  ]);
  const out = (await cmd.execute()) as ExecOut;
  const stdout = typeof out.stdout === 'string' ? out.stdout : '';
  return stdout.trim();
}

// Spawn-based API with streaming and cancel support
const running = new Map<string, Child>();

export type SpawnHandlers = {
  onStdout?: (line: string) => void;
  onStderr?: (line: string) => void;
  onClose?: (code?: number | null, signal?: number | null) => void;
};

function attachChild(jobId: string, child: Child, h: SpawnHandlers = {}) {
  running.set(jobId, child);
  const dec = new TextDecoder();
  child.stdout.on('data', (d) => h.onStdout?.(typeof d === 'string' ? d : dec.decode(d)));
  child.stderr.on('data', (d) => h.onStderr?.(typeof d === 'string' ? d : dec.decode(d)));
  child.on('close', ({ code, signal }) => {
    running.delete(jobId);
    h.onClose?.(code, signal);
  });
}

export async function startMusicGenText(
  jobId: string,
  prompt: string,
  seconds = 20,
  handlers?: SpawnHandlers,
) {
  const Command = await getCommand();
  const cmd = Command.create('musicgen-text', [
    'src-tauri/python/musicgen_engine.py',
    'text',
    prompt,
    String(seconds),
  ]);
  const child = await cmd.spawn();
  attachChild(jobId, child, handlers);
  return child.pid;
}

export async function startMusicGenMelody(
  jobId: string,
  prompt: string,
  melodyPath: string,
  seconds = 20,
  handlers?: SpawnHandlers,
) {
  const Command = await getCommand();
  const cmd = Command.create('musicgen-melody', [
    'src-tauri/python/musicgen_engine.py',
    'melody',
    prompt,
    melodyPath,
    String(seconds),
  ]);
  const child = await cmd.spawn();
  attachChild(jobId, child, handlers);
  return child.pid;
}

export async function cancelMusicJob(jobId: string) {
  const child = running.get(jobId);
  if (child) {
    try { await child.kill(); } catch { /* ignore */ }
    running.delete(jobId);
  }
}

// Helper to parse JSONL progress/file events; returns handlers suitable for start* functions
export function jsonlHandlers(update: (p: number) => void, setPath: (p: string) => void): SpawnHandlers {
  return {
    onStdout: (chunk) => {
      for (const line of chunk.split(/\r?\n/)) {
        const t = line.trim();
        if (!t) continue;
        try {
          const obj = JSON.parse(t);
          if (obj && obj.event === 'progress' && typeof obj.value === 'number') {
            const p = Math.max(0, Math.min(100, obj.value));
            update(p);
            continue;
          }
          if (obj && obj.event === 'file' && typeof obj.path === 'string') {
            setPath(obj.path);
            continue;
          }
        } catch (_) {
          // Fallbacks for legacy
          const m = t.match(/(\d{1,3})%/);
          if (m) update(Number(m[1]));
          if (/^FILE\s+(.+)$/i.test(t)) setPath(t.replace(/^FILE\s+/, ''));
          if (/\.(wav|mp3|flac)$/i.test(t)) setPath(t);
        }
      }
    },
  };
}
