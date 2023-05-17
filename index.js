const axios = require("axios");
const tar = require("tar");
const fs = require("fs");
const path = require("path");
const pkg = require("./package.json");
const { spawn } = require("child_process");

const args = process.argv.slice(2);

const isWindows = process.platform === "win32";
const outputPath = path.join(__dirname, "bin");
const outputBin = path.join(outputPath, isWindows ? "vale.exe" : "vale");

function getPlatform() {
  const { platform, arch } = process;
  if (platform === "win32") {
    if (arch === "x64") return "Windows_64-bit";
    if (arch === "x32") return "Windows_386";
    if (arch === "arm64") return "Windows_arm64";
  }
  if (platform === "linux") {
    if (arch === "x64") return "Linux_64-bit";
    if (arch === "x32") return "Linux_386";
    if (arch === "arm64") return "Linux_arm64";
  }
  if (platform === "darwin") {
    if (arch === "x64") return "macOS_64-bit";
    if (arch === "arm64") return "macOS_arm64";
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

function getReleaseUrl() {
  const platform = getPlatform();
  const version = pkg.version.split("-").at(0);
  return `https://github.com/errata-ai/vale/releases/download/v${version}/vale_${version}_${platform}${
    isWindows ? ".zip" : ".tar.gz"
  }`;
}

async function downloadAndExtract() {
  const url = getReleaseUrl();
  const response = await axios.get(url, { responseType: "stream" });
  return new Promise((resolve, reject) => {
    let pipe;
    if (isWindows) {
      pipe = response.pipe(unzipper.Extract({ path: outputPath }));
    } else {
      pipe = response.data.pipe(tar.extract({ cwd: outputPath }));
    }
    pipe.on("close", resolve).on("error", reject);
  });
}

if (!fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath, { recursive: true });
}

(async () => {
  if (!fs.existsSync(outputBin)) await downloadAndExtract();
  // run vale or vale.exe
  // const child = spawn(outputBin, args, { stdio: "inherit" });
  // child.on("exit", (code) => {
  //   process.exit(code);
  // });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
