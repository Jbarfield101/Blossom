#!/usr/bin/env -S node --loader tsx
/*
  Convert all .flac samples under public/sfz_sounds to 16-bit WAV and
  update .sfz files to reference .wav instead of .flac.

  Usage:
    npx tsx scripts/sfz-flac-to-wav.ts [--in public/sfz_sounds] [--delete-flac] [--dry-run]

  Requirements:
    - ffmpeg must be available on PATH.
*/

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

interface Options {
  root: string;
  deleteFlac: boolean;
  dryRun: boolean;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  let root = 'public/sfz_sounds';
  let deleteFlac = false;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--in' && args[i + 1]) {
      root = args[++i];
    } else if (a === '--delete-flac') {
      deleteFlac = true;
    } else if (a === '--dry-run') {
      dryRun = true;
    }
  }
  return { root, deleteFlac, dryRun };
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

async function ffmpegConvert(inPath: string, outPath: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[dry] ffmpeg -y -i "${inPath}" -c:a pcm_s16le "${outPath}"`);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-y', '-i', inPath, '-c:a', 'pcm_s16le', outPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

function replaceSampleFlacToWav(line: string): string {
  if (/^\s*(?:\/\/|#)/.test(line)) return line; // comment
  if (!/sample\s*=/.test(line)) return line;
  return line.replace(/(sample\s*=\s*)([^\s#;]+)/, (_m, g1: string, g2: string) => {
    // Only change extension if .flac suffix present
    if (/\.flac$/i.test(g2)) {
      const wav = g2.replace(/\.flac$/i, '.wav');
      return g1 + wav;
    }
    return g1 + g2;
  });
}

async function updateSfz(sfzPath: string, dryRun: boolean): Promise<boolean> {
  const text = await fs.readFile(sfzPath, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const updated = lines.map(replaceSampleFlacToWav);
  const next = updated.join(eol);
  if (next !== text) {
    if (dryRun) {
      console.log(`[dry] update ${sfzPath} (replace .flac -> .wav in sample=...)`);
    } else {
      await fs.writeFile(sfzPath, next, 'utf8');
    }
    return true;
  }
  return false;
}

async function main() {
  const { root, deleteFlac, dryRun } = parseArgs();
  const absRoot = path.resolve(root);
  try {
    await fs.access(absRoot);
  } catch {
    console.error(`Input directory not found: ${absRoot}`);
    process.exit(1);
  }

  const files = await walk(absRoot);
  const flacs = files.filter((f) => f.toLowerCase().endsWith('.flac'));
  const sfzs = files.filter((f) => f.toLowerCase().endsWith('.sfz'));

  console.log(`Found ${flacs.length} FLAC and ${sfzs.length} SFZ files under ${absRoot}`);

  // Convert FLAC -> WAV
  let converted = 0;
  for (const inPath of flacs) {
    const outPath = inPath.replace(/\.flac$/i, '.wav');
    await ffmpegConvert(inPath, outPath, dryRun);
    converted++;
    if (deleteFlac && !dryRun) {
      await fs.rm(inPath, { force: true });
    }
  }

  // Update SFZ references
  let updatedSfz = 0;
  for (const sfz of sfzs) {
    const changed = await updateSfz(sfz, dryRun);
    if (changed) updatedSfz++;
  }

  console.log(`Conversion complete: ${converted} WAV written. Updated ${updatedSfz} SFZ file(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
