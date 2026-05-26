const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const tar = require("tar");
const unzipper = require("unzipper");
const pkg = require("./package.json");

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

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.destroy();
        return fetchURL(response.headers.location).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      // Handle gzip encoding
      let stream = response;
      if (response.headers['content-encoding'] === 'gzip') {
        stream = response.pipe(zlib.createGunzip());
      }
      
      resolve(stream);
    }).on("error", reject);
  });
}

async function downloadAndExtract() {
  const url = getReleaseUrl();
  const stream = await fetchURL(url);
  return new Promise((resolve, reject) => {
    let pipe;
    if (isWindows) {
      pipe = stream.pipe(unzipper.Extract({ path: outputPath }));
    } else {
      pipe = stream.pipe(tar.extract({ cwd: outputPath }));
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
