import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import YAML from "yaml";

async function idsFromDir(dir: string): Promise<string[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const ids: string[] = [];
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const content = await fs.readFile(path.join(dir, file), "utf8");
    const match = /^---\n([\s\S]+?)\n---/.exec(content);
    if (match) {
      const data = YAML.parse(match[1]);
      if (data.id) ids.push(data.id);
    }
  }
  return ids;
}

describe("dnd index sync", () => {
  it("npc index matches npc files", async () => {
    const fileIds = await idsFromDir(path.join("dnd", "npcs"));
    const index = JSON.parse(
      await fs.readFile(path.join("dnd", "npc", "index.json"), "utf8")
    );
    const indexIds = index.map((e: any) => e.id);
    expect(new Set(indexIds)).toEqual(new Set(fileIds));
  });

  it("lore index matches lore files", async () => {
    const fileIds = await idsFromDir(path.join("dnd", "lore"));
    const index = JSON.parse(
      await fs.readFile(path.join("dnd", "lore", "index.json"), "utf8")
    );
    const indexIds = index.map((e: any) => e.id);
    expect(new Set(indexIds)).toEqual(new Set(fileIds));
  });
});

