#!/usr/bin/env -S node --loader tsx
/*
  Verify that all sample paths referenced in SFZ files exist on disk.

  Usage:
    npx tsx scripts/verify-sfz-samples.ts [--in public/sfz_sounds]
*/

import { promises as fs } from 'node:fs';
import path from 'node:path';

interface Options {
  root: string;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  let root = 'public/sfz_sounds';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--in' && args[i + 1]) {
      root = args[++i];
    }
  }
  return { root };
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

async function verifySfz(sfzPath: string, missing: Set<string>): Promise<void> {
  const text = await fs.readFile(sfzPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const baseDir = path.dirname(sfzPath);
  let defaultDir = baseDir;
  for (const line of lines) {
    if (/^\s*(?:\/\/|#)/.test(line)) continue;
    const dp = line.match(/^\s*default_path\s*=\s*([^\s#;]+)/i);
    if (dp) {
      defaultDir = path.resolve(baseDir, dp[1]);
      continue;
    }
    const sm = line.match(/sample\s*=\s*([^\s#;]+)/i);
    if (sm) {
      const sampleRef = sm[1];
      const samplePath = path.resolve(defaultDir, sampleRef);
      try {
        await fs.access(samplePath);
      } catch {
        missing.add(samplePath);
      }
    }
  }
}

async function main() {
  const { root } = parseArgs();
  const absRoot = path.resolve(root);
  try {
    await fs.access(absRoot);
  } catch {
    console.error(`Input directory not found: ${absRoot}`);
    process.exit(1);
  }

  const files = await walk(absRoot);
  const sfzs = files.filter((f) => f.toLowerCase().endsWith('.sfz'));

  const missing = new Set<string>();
  for (const sfz of sfzs) {
    await verifySfz(sfz, missing);
  }

  if (missing.size > 0) {
    console.error('Missing sample files:');
    for (const p of missing) {
      console.error(' - ' + path.relative(process.cwd(), p));
    }
    process.exit(1);
  } else {
    console.log(`All samples found for ${sfzs.length} SFZ file(s).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
