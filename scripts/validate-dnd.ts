import { zNpc, zLore, zQuest, zSpell, zRule } from "../src/features/dnd/schemas";

const schemas: Record<string, any> = {
  npc: zNpc,
  lore: zLore,
  quest: zQuest,
  spell: zSpell,
  rule: zRule,
};

const [, , kind, jsonStr] = process.argv;

if (!kind || !(kind in schemas)) {
  console.error("unknown schema type");
  process.exit(1);
}

try {
  const data = JSON.parse(jsonStr || "{}");
  const parsed = schemas[kind as keyof typeof schemas].parse(data);
  process.stdout.write(JSON.stringify(parsed));
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
