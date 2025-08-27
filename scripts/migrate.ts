import { initDb } from "../src/db";

function main() {
  initDb();
  console.log("Database migrated");
}

main();
