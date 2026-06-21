#!/usr/bin/env node
/**
 * Печать QR-кода со ссылкой в терминал.
 * Использование: node scripts/print-qr.js <url>
 */
const url = process.argv[2];

if (!url) {
  console.error("Использование: node scripts/print-qr.js <url>");
  process.exit(1);
}

try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const qrcode = require("qrcode-terminal");
  console.log(`\n${url}\n`);
  qrcode.generate(url, { small: true });
  console.log("");
} catch (error) {
  console.error("Установите зависимость: cd server && npm install");
  console.error(error.message);
  process.exit(1);
}
