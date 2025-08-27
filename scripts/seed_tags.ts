import { initDb, createTag } from "../src/db";

const TAGS = ["#Weapon", "#Armor", "#Consumable"];

function main() {
  initDb();
  for (const name of TAGS) {
    createTag(name);
  }
  console.log("Seeded tags");
}

main();
