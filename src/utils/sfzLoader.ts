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

export function parseSfz(text: string, basePath = ''): SfzRegion[] {
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
        current.sample = basePath ? basePath + value : value;
      } else {
        const num = Number(value);
        current[key] = isNaN(num) ? value : num;
      }
    }
  }

  return regions.filter((r) => r.sample);
}

export async function loadSfz(path: string): Promise<SfzInstrument> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Unable to load SFZ: ${path}`);
  }
  const text = await res.text();
  const basePath = path.includes('/')
    ? path.substring(0, path.lastIndexOf('/') + 1)
    : '';
  const regions = parseSfz(text, basePath);

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

  const sampler = new Tone.Sampler({ urls });
  await Tone.loaded();

  return { regions, sampler };
}

