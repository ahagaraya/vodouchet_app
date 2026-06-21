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

function hostnameFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
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

  const args = ["http", String(port)];
  const ngrokDomain = process.env.NGROK_DOMAIN?.trim();
  const publicUrl = process.env.PUBLIC_URL?.trim();

  if (ngrokDomain) {
    args.push("--domain", ngrokDomain);
  } else if (publicUrl) {
    const host = hostnameFromUrl(publicUrl);
    if (host && !host.includes("localhost")) {
      args.push("--url", publicUrl.replace(/\/$/, ""));
    }
  }

  ngrokChild = spawn("ngrok", args, { stdio: "ignore" });
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

function pickQrUrl(tunnelUrl) {
  const brand = process.env.SITE_BRAND?.trim() || "vodouchet.com";
  const desired = normalizeUrl(process.env.PUBLIC_URL?.trim());
  const tunnel = normalizeUrl(tunnelUrl);

  if (!tunnel) {
    return { brand, qrUrl: desired, siteUrl: desired };
  }

  if (desired) {
    const desiredHost = hostnameFromUrl(desired);
    const tunnelHost = hostnameFromUrl(tunnel);
    if (desiredHost && desiredHost === tunnelHost) {
      return { brand, qrUrl: desired, siteUrl: desired };
    }
  }

  return { brand, qrUrl: tunnel, siteUrl: desired || tunnel };
}

async function resolvePublicUrl(port) {
  let tunnelUrl = await fetchNgrokUrl();

  const autoNgrok = process.env.AUTO_NGROK !== "0" && process.env.AUTO_NGROK !== "false";
  if (!tunnelUrl && autoNgrok && hasNgrok()) {
    const hasCustomDomain = Boolean(
      process.env.NGROK_DOMAIN?.trim() ||
        (process.env.PUBLIC_URL?.trim() && !process.env.PUBLIC_URL.includes("ngrok"))
    );

    console.log(
      hasCustomDomain
        ? `Поднимаю туннель для ${process.env.SITE_BRAND || "vodouchet.com"}...`
        : "Поднимаю публичную ссылку через ngrok..."
    );

    if (startNgrok(port)) {
      tunnelUrl = await waitForNgrokUrl(hasCustomDomain ? 8 : 15);
    }

    if (!tunnelUrl && hasCustomDomain) {
      stopNgrok();
      await new Promise((r) => setTimeout(r, 500));
      console.log("Кастомный домен недоступен — временный адрес ngrok...");
      delete process.env.NGROK_DOMAIN;
      const savedPublic = process.env.PUBLIC_URL;
      delete process.env.PUBLIC_URL;
      if (startNgrok(port)) {
        tunnelUrl = await waitForNgrokUrl();
      }
      if (savedPublic) process.env.PUBLIC_URL = savedPublic;
    }
  }

  return pickQrUrl(tunnelUrl);
}

process.on("SIGINT", stopNgrok);
process.on("SIGTERM", stopNgrok);

module.exports = {
  hasNgrok,
  fetchNgrokUrl,
  resolvePublicUrl,
  stopNgrok,
  pickQrUrl
};
