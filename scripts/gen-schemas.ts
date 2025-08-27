import { promises as fs } from "fs";
import path from "path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { zNpc } from "../src/dnd/schemas/npc";
import { zLore } from "../src/features/dnd/schemas";
import { zItem } from "../src/dnd/schemas/item";
import { zTag } from "../src/dnd/schemas/tag";

async function main() {
  const outDir = path.resolve("dnd", "schemas");
  await fs.mkdir(outDir, { recursive: true });

  const npcJson = zodToJsonSchema(zNpc, "npc");
  await fs.writeFile(path.join(outDir, "npc.schema.json"), JSON.stringify(npcJson, null, 2));

  const loreJson = zodToJsonSchema(zLore, "lore");
  await fs.writeFile(path.join(outDir, "lore.schema.json"), JSON.stringify(loreJson, null, 2));

  const itemJson = zodToJsonSchema(zItem, "item");
  await fs.writeFile(path.join(outDir, "item.schema.json"), JSON.stringify(itemJson, null, 2));

  const tagJson = zodToJsonSchema(zTag, "tag");
  await fs.writeFile(path.join(outDir, "tag.schema.json"), JSON.stringify(tagJson, null, 2));
}

main();
