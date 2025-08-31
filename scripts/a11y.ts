import { spawn } from "node:child_process";
import pa11y from "pa11y";

const themes = [
  "default",
  "forest",
  "sunset",
  "sakura",
  "studio",
  "galaxy",
  "retro",
  "noir",
  "aurora",
  "rainy",
  "pastel",
  "mono",
  "eclipse",
];

function runCmd(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: "inherit" });
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

async function run() {
  await runCmd("npm", ["run", "build"]);
  const server = spawn("npm", ["run", "preview", "--", "--port", "4173"], {
    stdio: "inherit",
  });
  await new Promise((r) => setTimeout(r, 3000));

  let hasErrors = false;
  for (const theme of themes) {
    const result = await pa11y("http://localhost:4173", {
      actions: [
        "wait for element body",
        `evaluate document.body.className = 'theme-${theme}'`,
        "wait for 500",
      ],
      standard: "WCAG2AA",
      runners: ["axe"],
    });
    if (result.issues.length > 0) {
      console.error(`\nAccessibility issues for theme ${theme}:`);
      for (const issue of result.issues) {
        console.error(`- ${issue.code}: ${issue.message} (${issue.selector})`);
      }
      hasErrors = true;
    }
  }
  server.kill("SIGTERM");
  if (hasErrors) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

