#!/usr/bin/env node
/**
 * Без интерактива: записать Gmail SMTP в server/.env
 * node scripts/apply-gmail-env.js your@gmail.com "xxxx xxxx xxxx xxxx"
 */

const fs = require("fs");
const path = require("path");

const email = process.argv[2];
const pass = process.argv[3];

if (!email || !pass) {
  console.error('Использование: node scripts/apply-gmail-env.js email@gmail.com "пароль_приложения"');
  process.exit(1);
}

const envPath = path.join(__dirname, "..", ".env");
const content = `PORT=4000
JWT_SECRET=${process.env.JWT_SECRET || "vodouchet-local-dev-secret-change-me"}

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=${email}
SMTP_PASS=${pass.replace(/\s+/g, "")}
MAIL_FROM=${email}

WEBHOOK_KEY=
`;

fs.writeFileSync(envPath, content);
console.log(`OK: ${envPath} (Gmail → ${email})`);
