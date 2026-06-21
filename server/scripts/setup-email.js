#!/usr/bin/env node
/**
 * Интерактивная настройка почты для server/.env
 * Запуск: node scripts/setup-email.js
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const envPath = path.join(__dirname, "..", ".env");
const examplePath = path.join(__dirname, "..", ".env.example");

function parseEnv(content) {
  const map = new Map();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    map.set(trimmed.slice(0, idx), trimmed.slice(idx + 1));
  }
  return map;
}

function serializeEnv(map, template) {
  const lines = template.split("\n");
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      const idx = trimmed.indexOf("=");
      if (idx === -1) return line;
      const key = trimmed.slice(0, idx);
      if (!map.has(key)) return line;
      return `${key}=${map.get(key)}`;
    })
    .join("\n");
}

function ask(rl, question, defaultValue = "") {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function main() {
  console.log("\n=== Настройка почты «Водоучет» ===\n");
  console.log("Gmail: нужен пароль приложения (не обычный пароль)");
  console.log("https://myaccount.google.com/apppasswords\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const provider = await ask(rl, "Провайдер (gmail/yandex/resend)", "gmail");
  const template = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : fs.readFileSync(examplePath, "utf8");
  const env = parseEnv(template);

  if (provider === "resend") {
    const apiKey = await ask(rl, "RESEND_API_KEY (re_...)");
    const mailFrom = await ask(rl, "MAIL_FROM", "onboarding@resend.dev");
    env.set("RESEND_API_KEY", apiKey);
    env.set("MAIL_FROM", mailFrom);
    env.set("SMTP_USER", "");
    env.set("SMTP_PASS", "");
  } else if (provider === "yandex") {
    const email = await ask(rl, "Email Yandex");
    const pass = await ask(rl, "Пароль приложения Yandex");
    env.set("SMTP_HOST", "smtp.yandex.ru");
    env.set("SMTP_PORT", "465");
    env.set("SMTP_SECURE", "true");
    env.set("SMTP_USER", email);
    env.set("SMTP_PASS", pass);
    env.set("MAIL_FROM", email);
    env.set("RESEND_API_KEY", "");
  } else {
    const email = await ask(rl, "Gmail адрес", "k.ilyexa@gmail.com");
    const pass = await ask(rl, "Пароль приложения Gmail (16 символов)");
    env.set("SMTP_HOST", "smtp.gmail.com");
    env.set("SMTP_PORT", "465");
    env.set("SMTP_SECURE", "true");
    env.set("SMTP_USER", email);
    env.set("SMTP_PASS", pass);
    env.set("MAIL_FROM", email);
    env.set("RESEND_API_KEY", "");
  }

  rl.close();

  const output = serializeEnv(env, template);
  fs.writeFileSync(envPath, output.endsWith("\n") ? output : `${output}\n`);
  console.log(`\nСохранено: ${envPath}`);
  console.log("Перезапустите сервер: npm start");
  console.log("Проверка: npm run test:email\n");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
