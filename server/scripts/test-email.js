#!/usr/bin/env node
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { sendCodeEmail, isEmailConfigured } = require("../src/mail");

async function main() {
  const to = process.argv[2] || process.env.SMTP_USER;
  if (!to) {
    console.error("Укажите email: npm run test:email -- your@mail.com");
    process.exit(1);
  }
  if (!isEmailConfigured()) {
    console.error("Почта не настроена. Запустите: node scripts/setup-email.js");
    process.exit(1);
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const result = await sendCodeEmail(to, code, "Тест — ООО «Водоучет»");
  if (result.sent) {
    console.log(`OK: письмо отправлено на ${to} через ${result.provider}`);
    console.log(`Тестовый код: ${code}`);
  } else {
    console.log(`Fallback: код ${code} (письмо не отправлено)`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Ошибка:", error.message);
  process.exit(1);
});
