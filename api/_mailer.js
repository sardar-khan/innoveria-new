/**
 * Shared SMTP helper for the /api functions (not a route: the leading underscore
 * tells Vercel to treat this as a support file, not an endpoint).
 *
 * Reads the SMTP_* / MAIL_FROM environment variables documented in .env.example.
 */

const nodemailer = require("nodemailer");

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function mailer() {
  const port = Number(process.env.SMTP_PORT || 465);
  const tls = {};
  if (process.env.SMTP_TLS_SERVERNAME) {
    // The mail host serves a shared-hosting wildcard cert (*.web-hosting.com),
    // so validate against the name the cert actually covers.
    tls.servername = process.env.SMTP_TLS_SERVERNAME;
  } else {
    // No cert name supplied: still send, but skip validation rather than fail.
    tls.rejectUnauthorized = false;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: tls,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });
}

function mailFrom() {
  return process.env.MAIL_FROM || process.env.SMTP_USER;
}

module.exports = { smtpConfigured, mailer, mailFrom };
