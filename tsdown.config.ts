import { defineConfig } from "tsdown";
export default defineConfig([
  {
    entry: "src/index.ts",
    minify: false,
    target: "ES2015",
    format: "commonjs",
    publint: true,
  },
  {
    entry: "src/vale.ts",
    outDir: "bin",
    format: "commonjs",
  },
]);
