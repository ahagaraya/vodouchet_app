const qrcode = require("qrcode-terminal");
const { resolvePublicUrl, hasNgrok } = require("./tunnel");

function printQr(url, label) {
  console.log(`\n${label}`);
  console.log(url);
  qrcode.generate(url, { small: true });
  console.log("");
}

function printBrandBanner(brand) {
  const line = "═".repeat(Math.max(brand.length + 4, 28));
  console.log(`\n${line}`);
  console.log(`  ${brand}`);
  console.log(`${line}`);
}

async function printStartupQr(port) {
  printQr(`http://localhost:${port}/`, "QR — этот компьютер:");

  const { brand, qrUrl, siteUrl } = await resolvePublicUrl(port);
  if (qrUrl) {
    printBrandBanner(brand);
    if (siteUrl && hostnameFromUrl(siteUrl) !== hostnameFromUrl(qrUrl)) {
      console.log(`Адрес проекта: ${siteUrl.replace(/\/$/, "")}`);
      console.log(`Рабочая ссылка: ${qrUrl.replace(/\/$/, "")}`);
    } else {
      console.log(`Сайт: ${qrUrl.replace(/\/$/, "")}`);
    }
    printQr(qrUrl, `QR — ${brand}:`);
    return;
  }

  console.log("");
  if (hasNgrok()) {
    console.log("Публичная ссылка не получена.");
    console.log("Задайте в server/.env:");
    console.log("  SITE_BRAND=vodouchet.com");
    console.log("  PUBLIC_URL=https://vodouchet.com");
    console.log("  NGROK_DOMAIN=vodouchet.ngrok-free.app  # зарезервировать на dashboard.ngrok.com");
  } else {
    console.log("Установите ngrok: https://ngrok.com/download");
  }
  console.log("");
}

function hostnameFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

module.exports = { printStartupQr };
