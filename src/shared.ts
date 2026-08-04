import type { SupportedPlatforms, UpstreamAsset } from "@/src/types";
import { join } from "node:path";

export const platformMap: Record<SupportedPlatforms, UpstreamAsset> = {
  "linux-x64": "Linux_64-bit",
  "linux-arm64": "Linux_arm64",
  "darwin-x64": "macOS_64-bit",
  "darwin-arm64": "macOS_arm64",
  "win32-x64": "Windows_64-bit",
};

export const isWindows = process.platform === "win32";

export const outputPath = join(process.cwd(), "native");

export const outputBinName = isWindows ? "vale.exe" : "vale";
export const outputBin = join(outputPath, outputBinName);
