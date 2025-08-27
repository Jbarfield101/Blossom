import { promises as fs } from "fs";
import path from "path";
import { initDb, listItems, updateItem, listTags, createTag } from "../src/db";
import type { Item } from "../src/dnd/items";

interface CacheEntry {
  description: string;
  value?: number;
  tags: string[];
}

const CACHE_PATH = path.resolve("npc-storage", "item-cache.json");

async function loadCache(): Promise<Record<string, CacheEntry>> {
  try {
    const data = await fs.readFile(CACHE_PATH, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveCache(cache: Record<string, CacheEntry>) {
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
}

async function fetchItemInfo(name: string): Promise<CacheEntry> {
  const resp = await fetch("http://127.0.0.1:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-oss:20b",
      stream: false,
      messages: [
        {
          role: "system",
          content:
            "You are a Dungeons & Dragons 5e item assistant. Given an item name, reply in JSON with fields description, value (number, gp), and tags (array of strings beginning with #).",
        },
        { role: "user", content: name },
      ],
    }),
  });
  const json = await resp.json();
  const content = json?.message?.content || json?.content;
  if (typeof content !== "string") throw new Error("No content from LLM");
  return JSON.parse(content) as CacheEntry;
}

export async function enrichItems() {
  initDb();
  const items = listItems();
  const existingTags = new Set(listTags().map((t) => t.name));
  const cache = await loadCache();
  let cacheDirty = false;

  for (const item of items) {
    if (item.description && item.tags && item.tags.length) continue;
    let info = cache[item.name];
    if (!info) {
      info = await fetchItemInfo(item.name);
      cache[item.name] = info;
      cacheDirty = true;
    }
    const updated: Item = { ...item };
    if (!updated.description) updated.description = info.description;
    if (!updated.value && info.value !== undefined) updated.value = info.value;
    if (!updated.tags || !updated.tags.length) updated.tags = info.tags;
    if (updated.tags) {
      for (const tag of updated.tags) {
        if (!existingTags.has(tag)) {
          createTag(tag);
          existingTags.add(tag);
        }
      }
    }
    updateItem(updated);
  }

  if (cacheDirty) await saveCache(cache);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  enrichItems();
}
