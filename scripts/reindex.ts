import { promises as fs } from "fs";
import path from "path";
import YAML from "yaml";

function parseFrontmatter(content: string) {
  const match = /^---\n([\s\S]+?)\n---/.exec(content);
  if (match) {
    return YAML.parse(match[1]);
  }
  return {};
}

async function buildLoreIndex() {
  const loreDir = path.resolve("dnd", "lore");
  await fs.mkdir(loreDir, { recursive: true });
  const files = await fs.readdir(loreDir);
  const entries: any[] = [];
  for (const file of files) {
    if (file === "index.json") continue;
    const filepath = path.join("dnd", "lore", file);
    const ext = path.extname(file);
    let data: any = {};
    if (ext === ".md") {
      const content = await fs.readFile(filepath, "utf8");
      data = parseFrontmatter(content);
    } else if (ext === ".json") {
      data = JSON.parse(await fs.readFile(filepath, "utf8"));
    } else {
      continue;
    }
    entries.push({
      id: data.id,
      name: data.name,
      tags: data.tags || [],
      path: filepath,
    });
  }
  await fs.writeFile(path.join(loreDir, "index.json"), JSON.stringify(entries, null, 2) + "\n");
}

async function buildNpcIndex() {
  const npcsDir = path.resolve("dnd", "npcs");
  let files: string[] = [];
  try {
    files = await fs.readdir(npcsDir);
  } catch {
    files = [];
  }
  const entries: any[] = [];
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const filepath = path.join("dnd", "npcs", file);
    const content = await fs.readFile(filepath, "utf8");
    const data = parseFrontmatter(content);
    entries.push({
      id: data.id,
      name: data.name,
      tags: data.tags || [],
      path: filepath,
    });
  }
  const npcDir = path.resolve("dnd", "npc");
  await fs.mkdir(npcDir, { recursive: true });
  await fs.writeFile(path.join(npcDir, "index.json"), JSON.stringify(entries, null, 2) + "\n");
}

export async function reindex() {
  await buildLoreIndex();
  await buildNpcIndex();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  reindex();
}
