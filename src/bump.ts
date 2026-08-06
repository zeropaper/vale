import { platformMap } from "@/src/shared";
import {
  Binary,
  Failure,
  MetaFile,
  NamedSubject,
  Release,
  SkipReason,
  UpstreamAsset,
  VerificationResult,
  VersionEntry,
} from "@/src/types";
import { execFile } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";
const ASSET_REGEX = /^vale_[^_]+_(.+?)\.(?:tar\.gz|zip)$/;
const SKIP_THRESHOLD = 3; // maximum amount of times we retry a release before perma skipping
async function main() {
  async function getMetaFile(): Promise<MetaFile> {
    try {
      return JSON.parse(readFileSync("./meta.json", "utf-8"));
    } catch {
      return { versions: {} };
    }
  }

  async function getPackageFile(): Promise<{ version: string }> {
    return JSON.parse(readFileSync("./package.json", "utf-8"));
  }

  process.on("exit", () => {
    writeFileSync("./meta.json", JSON.stringify(metaFile, null, 2));
  });

  async function getVerification(
    version: string,
    meta: MetaFile,
  ): Promise<[true, VerificationResult] | [false, unknown]> {
    const execFileAsync = promisify(execFile);
    try {
      const { stdout } = await execFileAsync("gh", [
        "release",
        "verify",
        version,
        "-R",
        "vale-cli/vale",
        "--format",
        "json",
      ]);
      const json = JSON.parse(stdout) as VerificationResult;
      return [true, json];
    } catch (err) {
      return [false, err];
    }
  }
  async function getLatestVersion(): Promise<Release> {
    const res = await fetch(
      "https://api.github.com/repos/vale-cli/vale/releases/latest",
    );
    if (res.ok) {
      return (await res.json()) as Release;
    } else {
      if (res.status === 403 || res.status === 401 || res.status === 404) {
        throw new Error("Vale repository unreachable, verify the URL.");
      }
      console.warn(
        `Failed to get latest version, server responded with code ${res.status} - ${res.statusText}`,
      );
      process.exit(0);
    }
  }

  function fail(entry: Failure | undefined, reason: SkipReason): Failure {
    if (entry) {
      return {
        skip: reason,
        skip_count: (entry.skip_count ?? 0) + 1,
      };
    }
    return {
      skip: reason,
      skip_count: 1,
    };
  }

  const metaFile = await getMetaFile();
  const packageFile = await getPackageFile();
  const release = await getLatestVersion();
  const old = metaFile.versions[release.tag_name] as Failure | undefined;
  if (
    release.tag_name in metaFile.versions &&
    (Object.hasOwn(old!, "bins") ||
      (old as Failure).skip_count >= SKIP_THRESHOLD)
  ) {
    // either we've already released this version or we want to skip it
    return;
  }
  const [verified, result] = await getVerification(release.tag_name, metaFile);
  if (!verified) {
    metaFile.versions[release.tag_name] = fail(old, SkipReason.UNVERIFIED);
    console.error(
      `Verification failed on release ${release.tag_name}. Output: ${JSON.stringify(result)}`,
    );
    return;
  }
  const VALID_ARCH = new Set(Object.values(platformMap));
  const bins: Partial<Record<UpstreamAsset, Binary>> = {};
  const assetChecksums: Partial<Record<UpstreamAsset, string>> = {};
  for (const subject of result.verificationResult.statement.subject) {
    if (Object.hasOwn(subject, "uri")) continue;
    const namedSubject = subject as NamedSubject;
    if (namedSubject.name.endsWith("_checksums.txt")) continue;
    const match = namedSubject.name.match(ASSET_REGEX);
    if (match && VALID_ARCH.has(match[1] as UpstreamAsset)) {
      const arch = match[1] as UpstreamAsset;
      assetChecksums[arch] = namedSubject.digest.sha256;
    } else {
      metaFile["versions"][release.tag_name] = fail(old, SkipReason.INCOMPLETE);
      throw new TypeError(
        "Invalid GitHub API response. " + JSON.stringify(namedSubject),
      );
    }
  }
  if (Object.entries(assetChecksums).length !== VALID_ARCH.size) {
    metaFile["versions"][release.tag_name] = fail(old, SkipReason.INCOMPLETE);

    throw new Error(
      "Failed to get all binary checksums. Collected:\n" +
        JSON.stringify(assetChecksums, null, 2),
    );
  }

  release.assets.forEach((asset) => {
    const match = asset.name.match(ASSET_REGEX);
    if (match && VALID_ARCH.has(match[1] as UpstreamAsset)) {
      const arch = match[1] as UpstreamAsset;
      bins[arch] = {
        url: asset.url,
        checksum: assetChecksums[arch]!,
        size: asset.size,
      };
    }
  });
  if (Object.keys(bins).length !== VALID_ARCH.size) {
    metaFile["versions"][release.tag_name] = fail(old, SkipReason.INCOMPLETE);
    throw new Error(
      "Missing binaries from response. Got: " + JSON.stringify(bins),
    );
  }
  const version = {
    skip: false,
    bins,
  } as VersionEntry;
  metaFile.versions[release.tag_name] = version;
  packageFile.version = release.tag_name.replace(/^v/, "");
  writeFileSync("./package.json", JSON.stringify(packageFile, null, 2) + "\n");
  writeFileSync("./meta.json", JSON.stringify(metaFile, null, 2) + "\n");
  process.stdout.write(release.tag_name.replace(/^v/, ""));
}

main();
