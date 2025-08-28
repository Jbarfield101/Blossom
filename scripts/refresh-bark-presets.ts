import { writeFile } from 'fs/promises';
import { join } from 'path';

const REMOTE = 'https://api.github.com/repos/suno-ai/bark/contents/bark/assets/prompts';

async function main() {
  const res = await fetch(REMOTE);
  if (!res.ok) {
    throw new Error(`failed to fetch presets: ${res.status}`);
  }
  const data: Array<{ name: string }> = await res.json();
  const voices = data
    .filter((f) => f.name.endsWith('.npz'))
    .map((f) => 'v2/' + f.name.replace(/\.npz$/, ''))
    .sort();
  const outPath = join('src', 'features', 'voice', 'presets.json');
  await writeFile(outPath, JSON.stringify(voices, null, 2));
  console.log(`Wrote ${voices.length} presets to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
