import Database from "better-sqlite3";
import { zNpc, type Npc } from "../dnd/schemas/npc";
import { zItem, type Item } from "../dnd/schemas/item";
import { zTag, type Tag } from "../dnd/schemas/tag";

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database("blossom.db");
  }
  return db;
}

export function initDb() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS npcs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS item_tags (
      item_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (item_id, tag_id),
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);
}

// NPC operations
export function createNpc(npc: Npc) {
  const parsed = zNpc.parse(npc);
  const db = getDb();
  db.prepare("INSERT INTO npcs (id, name, data) VALUES (?, ?, ?)").run(
    parsed.id,
    parsed.name,
    JSON.stringify(parsed)
  );
}

export function getNpc(id: string): Npc | null {
  const db = getDb();
  const row = db.prepare("SELECT data FROM npcs WHERE id = ?").get(id);
  if (!row) return null;
  return zNpc.parse(JSON.parse(row.data));
}

export function updateNpc(npc: Npc) {
  const parsed = zNpc.parse(npc);
  const db = getDb();
  db.prepare("UPDATE npcs SET name = ?, data = ? WHERE id = ?").run(
    parsed.name,
    JSON.stringify(parsed),
    parsed.id
  );
}

export function deleteNpc(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM npcs WHERE id = ?").run(id);
}

export function listNpcs(): Npc[] {
  const db = getDb();
  const rows = db.prepare("SELECT data FROM npcs").all();
  return rows.map((r: any) => zNpc.parse(JSON.parse(r.data)));
}

// Tag operations
export function createTag(name: string): number {
  const db = getDb();
  const stmt = db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)");
  const info = stmt.run(name);
  return Number(info.lastInsertRowid);
}

export function listTags(): Tag[] {
  const db = getDb();
  const rows = db.prepare("SELECT id, name FROM tags").all();
  return rows.map((r: any) => zTag.parse(r));
}

export function deleteTag(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM tags WHERE id = ?").run(id);
}

// Item operations
export function createItem(item: Item) {
  const parsed = zItem.parse(item);
  const db = getDb();
  db.prepare("INSERT INTO items (id, name, data) VALUES (?, ?, ?)").run(
    parsed.id,
    parsed.name,
    JSON.stringify(parsed)
  );
  if (parsed.tags) {
    const link = db.prepare(
      "INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)"
    );
    const findTag = db.prepare("SELECT id FROM tags WHERE name = ?");
    for (const tag of parsed.tags) {
      const t = findTag.get(tag) as { id: number } | undefined;
      if (t) link.run(parsed.id, t.id);
    }
  }
}

export function getItem(id: string): Item | null {
  const db = getDb();
  const row = db.prepare("SELECT data FROM items WHERE id = ?").get(id);
  if (!row) return null;
  const item = zItem.parse(JSON.parse(row.data));
  const tags = db
    .prepare(
      "SELECT t.name FROM tags t JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?"
    )
    .all(id) as { name: string }[];
  if (tags.length) item.tags = tags.map((t) => t.name);
  return item;
}

export function updateItem(item: Item) {
  const parsed = zItem.parse(item);
  const db = getDb();
  db.prepare("UPDATE items SET name = ?, data = ? WHERE id = ?").run(
    parsed.name,
    JSON.stringify(parsed),
    parsed.id
  );
  db.prepare("DELETE FROM item_tags WHERE item_id = ?").run(parsed.id);
  if (parsed.tags) {
    const link = db.prepare(
      "INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)"
    );
    const findTag = db.prepare("SELECT id FROM tags WHERE name = ?");
    for (const tag of parsed.tags) {
      const t = findTag.get(tag) as { id: number } | undefined;
      if (t) link.run(parsed.id, t.id);
    }
  }
}

export function deleteItem(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM item_tags WHERE item_id = ?").run(id);
  db.prepare("DELETE FROM items WHERE id = ?").run(id);
}

export function listItems(): Item[] {
  const db = getDb();
  const rows = db.prepare("SELECT id, data FROM items").all() as {
    id: string;
    data: string;
  }[];
  const items: Item[] = [];
  const tagStmt = db.prepare(
    "SELECT t.name FROM tags t JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?"
  );
  for (const row of rows) {
    const parsed = zItem.parse(JSON.parse(row.data));
    const tags = tagStmt.all(row.id) as { name: string }[];
    if (tags.length) parsed.tags = tags.map((t) => t.name);
    items.push(parsed);
  }
  return items;
}
