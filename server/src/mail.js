const nodemailer = require("nodemailer");

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function isEmailConfigured() {
  return isResendConfigured() || isSmtpConfigured();
}

function createSmtpTransport() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || (host.includes("gmail") ? 465 : 587));
  const secure =
    process.env.SMTP_SECURE === "true" ||
    (process.env.SMTP_SECURE !== "false" && port === 465);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      minVersion: "TLSv1.2"
    }
  });
}

async function sendViaResend(to, subject, text) {
  const from = process.env.MAIL_FROM || "onboarding@resend.dev";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from, to: [to], subject, text })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || `Resend HTTP ${response.status}`);
  }
  return { provider: "resend", id: data.id };
}

async function sendViaSmtp(to, subject, text) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const info = await createSmtpTransport().sendMail({ from, to, subject, text });
  return { provider: "smtp", id: info.messageId };
}

async function sendCodeEmail(email, code, subject = "Код подтверждения — ООО «Водоучет»") {
  const text = [
    "Здравствуйте!",
    "",
    `Ваш код подтверждения: ${code}`,
    "",
    "Код действует до подтверждения регистрации.",
    "Если вы не регистрировались в приложении «Водоучет», просто проигнорируйте это письмо.",
    "",
    "— ООО «Водоучет»"
  ].join("\n");

  if (isResendConfigured()) {
    try {
      const result = await sendViaResend(email, subject, text);
      console.log(`[EMAIL] Resend → ${email} (${result.id})`);
      return { sent: true, ...result };
    } catch (error) {
      console.error(`[EMAIL] Resend error: ${error.message}`);
      if (!isSmtpConfigured()) throw error;
      console.log("[EMAIL] Пробуем SMTP...");
    }
  }

  if (isSmtpConfigured()) {
    try {
      const result = await sendViaSmtp(email, subject, text);
      console.log(`[EMAIL] SMTP → ${email} (${result.id})`);
      return { sent: true, ...result };
    } catch (error) {
      console.error(`[EMAIL] SMTP error: ${error.message}`);
      throw error;
    }
  }

  console.log(`[EMAIL FALLBACK] SMTP/Resend не настроены. Код для ${email}: ${code}`);
  return { sent: false, fallback: true, code };
}

function logEmailStartupStatus() {
  if (isResendConfigured()) {
    console.log("[EMAIL] Resend API настроен — письма отправляются через Resend");
    return;
  }
  if (isSmtpConfigured()) {
    console.log(`[EMAIL] SMTP настроен (${process.env.SMTP_HOST || "smtp.gmail.com"}) — письма отправляются на почту`);
    return;
  }
  console.log("[EMAIL] Почта НЕ настроена — коды только в консоли сервера");
  console.log("[EMAIL] Настройка: cp server/.env.example server/.env && node scripts/setup-email.js");
}

module.exports = {
  sendCodeEmail,
  isEmailConfigured,
  logEmailStartupStatus
};
