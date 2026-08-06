import { createHash } from "node:crypto";
import {
  Binary,
  MetaFile,
  SupportedPlatforms,
  UpstreamAsset,
} from "@/src/types";
import { mkdirSync, existsSync, createWriteStream } from "node:fs";
import { basename, join } from "node:path";
import { finished, pipeline } from "node:stream/promises";
import { mkdtemp, move, readFileSync, rm, writeFile } from "fs-extra";
import { tmpdir } from "node:os";

import meta from "@/meta.json";

import pkg from "@/package.json";
import {
  isWindows,
  outputBin,
  outputBinName,
  outputPath,
  platformMap,
} from "@/src/shared";
const hashFile = join(outputPath, "archive.sha256");
function getPlatform(): UpstreamAsset {
  const { platform, arch } = process;
  const platformKey = `${platform}-${arch}`;
  if (platformKey in platformMap) {
    return platformMap[platformKey as SupportedPlatforms];
  }
  throw new Error(
    `Unsupported platform: ${platformKey}. This is a restriction on Vale's end, if we're missing a valid platform, submit an issue.`,
  );
}
function getRelease(): Binary {
  const platform = getPlatform();
  const version = `v${pkg.version.split("-").at(0)}`;
  if (!version) {
    throw new Error("Unable to parse package version");
  }
  if (!Object.keys(meta.versions).includes(version)) {
    throw new Error(
      `An unexpected error occured: version ${version} is unknown. Report this.`,
    );
  }
  const { skip, bins } = (meta.versions as MetaFile["versions"])[version];
  if (skip === false) {
    return bins![platform];
  }
  throw new Error("Version should have been skipped by CI - report this.");
}

async function downloadAndExtract() {
  const bin = getRelease();
  const res = await fetch(bin.url, {
    headers: {
      Accept: "application/octet-stream",
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (res.ok && res.body !== null) {
    if (!res.url.startsWith("https:"))
      throw new Error(
        "Stopped due to downgrade attempt. Your connection may not be secure.",
      );
    if (
      !/^(?:[a-zA-Z0-9-]+\.)*(?:githubusercontent\.com|github\.com)$/i.test(
        new URL(res.url).hostname,
      )
    )
      throw new Error(
        "Connection was redirected outside of GitHub. Your connection may not be secure.",
      );
    const tempDir = await mkdtemp(join(tmpdir(), "@vvago-vale-"));
    try {
      const hash = createHash("sha256");
      const tempBinPath = join(tempDir, "vale.bin");
      const out = createWriteStream(tempBinPath);
      let recv = 0;
      for await (const chunk of res.body) {
        recv += chunk.length;
        if (recv > bin.size)
          throw new Error(
            `Download exceeded expected size. \n - Expected: ${bin.size}\n - Reported by server: ${res.headers.get("content-length")}\n`,
          );
        hash.update(chunk);
        if (!out.write(chunk)) {
          await new Promise((resolve) => out.once("drain", resolve));
        }
      }
      out.end();
      await finished(out);
      const digest = hash.digest("hex");
      if (digest !== bin.checksum) {
        throw new Error(
          `Binary does not match stored checksum. Your connection may be insecure or this may be an issue in ${pkg.name}.\n - Downloaded file: ${digest}\n - Stored: ${bin.checksum}`,
        );
      }
      if (
        !(await extractArchive(tempBinPath, join(tempDir, "unpacked"), [
          "LICENSE",
          outputBinName,
        ]))
      ) {
        throw new Error("Unable to extract the archive. Report this.");
      }

      await writeFile(hashFile, digest);
    } catch (e) {
      throw e;
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  } else {
    throw new Error("Download failed with status code: " + res.status);
  }
}

async function extractArchive(
  path: string,
  outPath: string,
  allowedNames: string[],
): Promise<boolean> {
  mkdirSync(outPath);

  const extracted: string[] = [];
  if (isWindows) {
    try {
      const yauzl = await import("yauzl");
      const zip = await yauzl.openPromise(path);
      for await (let entry of zip.eachEntry()) {
        if (!allowedNames.includes(entry.fileName)) {
          continue;
        }
        const stream = await zip.openReadStreamPromise(entry);
        extracted.push(join(outPath, entry.fileName));
        await pipeline(stream, createWriteStream(extracted.at(-1)!));
      }
    } catch (e) {
      console.error(e);
      return false;
    }
  } else {
    try {
      const tar = await import("tar");

      await tar.x({
        sync: false,
        z: true,
        f: path,
        filter: (file) => {
          return allowedNames.includes(basename(file));
        },
        onReadEntry: (entry) => {
          extracted.push(join(outPath, entry.path));
        },
        C: outPath,
      });
    } catch (e) {
      console.error(e);
      return false;
    }
  }
  try {
    for (const name of extracted) {
      await move(name, join(outputPath, basename(name)), { overwrite: true });
    }
  } catch (e) {
    console.error(e);
    return false;
  }
  return true;
}

if (!existsSync(outputPath)) {
  mkdirSync(outputPath, { recursive: true });
}
if (
  existsSync(outputBin) &&
  existsSync(hashFile) &&
  typeof (meta.versions as MetaFile["versions"])[`v${pkg.version.split("-").at(0)}`] === "object" &&
  typeof (meta.versions as MetaFile["versions"])[`v${pkg.version.split("-").at(0)}`].bins === "object" &&
  readFileSync(hashFile, "utf-8") ===
    (meta.versions as MetaFile["versions"])[`v${pkg.version.split("-").at(0)}`]
      .bins![getPlatform()].checksum
) {
  process.exit(0);
}
downloadAndExtract().catch((err) => {
  console.error(err);
  process.exit(1);
});
