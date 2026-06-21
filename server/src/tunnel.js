const http = require("http");
const { spawn, execSync } = require("child_process");

let ngrokChild = null;

function hasNgrok() {
  try {
    execSync("command -v ngrok", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(url) {
  if (!url) return null;
  return url.endsWith("/") ? url : `${url}/`;
}

function fetchNgrokUrl() {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:4040/api/tunnels", (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const tunnels = JSON.parse(data).tunnels || [];
          const https = tunnels.find((t) => t.public_url?.startsWith("https://"));
          resolve(normalizeUrl(https?.public_url || tunnels[0]?.public_url));
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

function startNgrok(port) {
  if (ngrokChild || !hasNgrok()) return false;
  ngrokChild = spawn("ngrok", ["http", String(port)], { stdio: "ignore" });
  ngrokChild.on("exit", () => {
    ngrokChild = null;
  });
  return true;
}

function stopNgrok() {
  if (ngrokChild) {
    ngrokChild.kill();
    ngrokChild = null;
  }
}

async function waitForNgrokUrl(maxAttempts = 15, delayMs = 1000) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const url = await fetchNgrokUrl();
    if (url) return url;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

async function resolvePublicUrl(port) {
  let tunnelUrl = await fetchNgrokUrl();

  const autoNgrok = process.env.AUTO_NGROK !== "0" && process.env.AUTO_NGROK !== "false";
  if (!tunnelUrl && autoNgrok && hasNgrok()) {
    console.log("Поднимаю публичную ссылку через ngrok...");
    if (startNgrok(port)) {
      tunnelUrl = await waitForNgrokUrl();
    }
  }

  return tunnelUrl;
}

process.on("SIGINT", stopNgrok);
process.on("SIGTERM", stopNgrok);

module.exports = {
  hasNgrok,
  fetchNgrokUrl,
  resolvePublicUrl,
  stopNgrok
};
