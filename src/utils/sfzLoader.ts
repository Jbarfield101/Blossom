import * as Tone from 'tone';

export interface SfzRegion {
  sample: string;
  lokey?: number;
  hikey?: number;
  key?: number;
  pitch_keycenter?: number;
  [opcode: string]: string | number | undefined;
}

export interface SfzInstrument {
  regions: SfzRegion[];
  sampler: Tone.Sampler;
}

export async function parseSfz(
  text: string,
  basePath = '',
): Promise<SfzRegion[]> {
  const lines = text.split(/\r?\n/);
  const regions: SfzRegion[] = [];
  let current: SfzRegion | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;
    if (line.startsWith('<region')) {
      current = { sample: '' };
      regions.push(current);
      continue;
    }
    if (line.startsWith('<group')) {
      current = null;
      continue;
    }
    const match = line.match(/^([^=]+)=(.+)$/);
    if (match && current) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key === 'sample') {
        if (basePath) {
          try {
            current.sample = new URL(value, basePath).toString();
          } catch {
            current.sample = basePath + value;
          }
        } else {
          current.sample = value;
        }
      } else {
        const num = Number(value);
        current[key] = isNaN(num) ? value : num;
      }
    }
  }

  const filtered = regions.filter((r) => r.sample);
  const uniqueSamples = Array.from(new Set(filtered.map((r) => r.sample)));
  const missing: string[] = [];
  await Promise.all(
    uniqueSamples.map(async (url) => {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (!res.ok) missing.push(url);
      } catch {
        missing.push(url);
      }
    }),
  );
  if (missing.length) {
    throw new Error(`Missing samples: ${missing.join(', ')}`);
  }
  return filtered;
}

export async function loadSfz(
  path: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<SfzInstrument> {
  let res: Response;
  try {
    res = await fetch(path);
  } catch {
    throw new Error(`Unable to load SFZ: ${path} (file not found)`);
  }
  if (!res.ok) {
    throw new Error(`Unable to load SFZ: ${path} (HTTP ${res.status})`);
  }
  const text = await res.text();
  const basePath = path.includes('/')
    ? path.substring(0, path.lastIndexOf('/') + 1)
    : '';
  const regions = await parseSfz(text, basePath);

  const urls: Record<string, string> = {};
  for (const region of regions) {
    const midi =
      typeof region.pitch_keycenter === 'number'
        ? region.pitch_keycenter
        : typeof region.key === 'number'
          ? region.key
          : typeof region.lokey === 'number'
            ? region.lokey
            : undefined;
    if (midi !== undefined) {
      const note = Tone.Frequency(midi, 'midi').toNote();
      urls[note] = region.sample;
    }
  }

  const buffers: Record<string, Tone.ToneAudioBuffer> = {};
  const entries = Object.entries(urls);
  const total = entries.length;
  let loaded = 0;
  await Promise.all(
    entries.map(async ([note, url]) => {
      try {
        const buffer = await Tone.ToneAudioBuffer.fromUrl(url);
        buffers[note] = buffer;
        loaded += 1;
        onProgress?.(loaded, total);
      } catch (e) {
        throw new Error(`Failed to load sample: ${url}`);
      }
    }),
  );

  const sampler = new Tone.Sampler({ urls: buffers });
  await Tone.loaded();

  return { regions, sampler };
}

