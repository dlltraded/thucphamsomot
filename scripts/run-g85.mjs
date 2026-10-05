import { spawnSync } from "node:child_process";
import path from "node:path";

const tsxCli = path.resolve("node_modules/tsx/dist/cli.mjs");
const testFile = path.resolve("scratch/test_g8_5_full_negative_suite.mjs");
const existingNodeOptions = process.env.NODE_OPTIONS?.trim() || "";
const nodeOptions = `${existingNodeOptions} --use-system-ca`.trim();

const result = spawnSync(process.execPath, [tsxCli, testFile], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
