import { promises as fs } from "fs";
import path from "path";

async function buildLoreIndex() {
  const loreDir = path.resolve("dnd", "lore");
  await fs.mkdir(loreDir, { recursive: true });
  const files = await fs.readdir(loreDir);
  const entries = [];
  for (const file of files) {
    if (file === "index.json") continue;
    const filepath = path.join("dnd", "lore", file);
    const slug = path.parse(file).name;
    entries.push({
      name: slug.replace(/-/g, " "),
      slug,
      tags: [],
      path: filepath
    });
  }
  await fs.writeFile(path.join(loreDir, "index.json"), JSON.stringify(entries, null, 2));
}

async function buildNpcIndex() {
  const specDir = path.resolve("npc", "specs");
  let files: string[] = [];
  try {
    files = await fs.readdir(specDir);
  } catch {
    return;
  }
  const entries = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const specPath = path.join("npc", "specs", file);
    const content = JSON.parse(await fs.readFile(specPath, "utf8"));
    const base = path.parse(file).name;
    entries.push({
      id: content.id,
      name: content.name,
      tags: content.tags || [],
      paths: {
        spec: specPath,
        portrait: path.join("npc", "portraits", `${base}.png`),
        pdf: path.join("npc", "pdfs", `${base}.pdf`),
        voice: path.join("npc", "voices", `${base}.mp3`)
      }
    });
  }
  const npcDir = path.resolve("dnd", "npc");
  await fs.mkdir(npcDir, { recursive: true });
  await fs.writeFile(path.join(npcDir, "index.json"), JSON.stringify(entries, null, 2));
}

export async function reindex() {
  await buildLoreIndex();
  await buildNpcIndex();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  reindex();
}
