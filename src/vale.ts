#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { outputBinName } from "./shared";
const result = spawnSync(
  join(import.meta.dirname, "..", "native", outputBinName),
  process.argv.slice(2),
  {
    stdio: "inherit",
  },
);
if (result.signal) {
    console.error(`Process failed with signal: ${result.signal}`)
}
process.exit(result.status ?? 1);
