const qrcode = require("qrcode-terminal");
const { resolvePublicUrl, hasNgrok } = require("./tunnel");

function printQr(url, label) {
  console.log(`\n${label}`);
  console.log(url);
  qrcode.generate(url, { small: true });
  console.log("");
}

async function printStartupQr(port) {
  printQr(`http://localhost:${port}/`, "QR — этот компьютер:");

  const publicUrl = await resolvePublicUrl(port);
  if (publicUrl) {
    console.log(`Публичная ссылка: ${publicUrl.replace(/\/$/, "")}`);
    printQr(publicUrl, "QR — открыть с телефона:");
    return;
  }

  console.log("");
  if (hasNgrok()) {
    console.log("Публичная ссылка не получена.");
    console.log("Выполните один раз: ngrok config add-authtoken ВАШ_ТОКЕН");
    console.log("Токен: https://dashboard.ngrok.com/get-started/your-authtoken");
    console.log("В server/.env: AUTO_NGROK=1");
  } else {
    console.log("Установите ngrok: https://ngrok.com/download");
    console.log("Затем: ngrok config add-authtoken ВАШ_ТОКЕН");
  }
  console.log("");
}

module.exports = { printStartupQr };
