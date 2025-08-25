import { promises as fs } from "fs";
import path from "path";
import { zNpc } from "../src/dnd/schemas/npc";
import { reindex } from "./reindex";

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface Args {
  theme: string;
  count: number;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = { theme: "npc", count: 1 };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (key === "--theme" && value) result.theme = value;
    if (key === "--count" && value) result.count = parseInt(value, 10);
  }
  return result;
}

async function main() {
  const { theme, count } = parseArgs();
  const specsDir = path.resolve("npc", "specs");
  await fs.mkdir(specsDir, { recursive: true });

  for (let i = 0; i < count; i++) {
    const id = `${slugify(theme)}-${i + 1}`;
    const spec = {
      id,
      name: `${theme} NPC ${i + 1}`,
      species: "Unknown",
      role: "Commoner",
      alignment: "Neutral",
      playerCharacter: false,
      hooks: ["A mysterious opportunity"],
      statblock: {},
      tags: [theme],
    };
    const parsed = zNpc.safeParse(spec);
    if (!parsed.success) {
      console.error("Validation failed", parsed.error);
      continue;
    }
    await fs.writeFile(
      path.join(specsDir, `${id}.json`),
      JSON.stringify(spec, null, 2)
    );
  }

  await reindex();
}

main();
