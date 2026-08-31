/**
 * Vercel serverless function: contact-form lead capture + admin API.
 *
 * POST   /api/lead            store a lead, email an instant confirmation to the
 *                             sender, and notify the team (called by the contact form)
 * GET    /api/lead            list all leads   (requires Authorization: Bearer <ADMIN_KEY>)
 * DELETE /api/lead?id=<id>    delete one lead  (requires Authorization: Bearer <ADMIN_KEY>)
 *
 * Environment variables:
 *   Storage (see README, "Leads admin portal"):
 *     KV_REST_API_URL / KV_REST_API_TOKEN   added automatically when you attach
 *       an Upstash Redis (Vercel KV) store to the project, or the
 *       UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN pair from the
 *       Upstash marketplace integration.
 *     ADMIN_KEY   any strong secret you choose; it is the admin portal password.
 *   Email confirmation (see .env.example):
 *     SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS   sending mailbox credentials.
 *     SMTP_TLS_SERVERNAME   hostname the TLS cert covers (shared hosting quirk).
 *     MAIL_FROM             From header, e.g. "Innovaria Tech <info@...>".
 *     LEAD_NOTIFY_TO        where the internal "new lead" notice is emailed.
 *
 * Design note: storage and both emails are best-effort and independent. A lead
 * is never lost to an email failure, and the response reports exactly which
 * side effects succeeded so the form can only claim a confirmation was emailed
 * when one actually was. Failures are logged (visible in Vercel function logs).
 */

const { smtpConfigured, mailer } = require("./_mailer");

const LIST_KEY = "innovaria:leads";
const MAX_LEADS = 1000;

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Detect the visitor's site language from the page they submitted from. The
// form sends window.location.pathname, e.g. "/es/contact", "/de", "/contact".
function localeFromPage(page) {
  const p = String(page == null ? "" : page);
  if (/^\/es(\/|$)/.test(p)) return "es";
  if (/^\/de(\/|$)/.test(p)) return "de";
  return "en";
}

// Confirmation to the person who submitted the form, in their site language
// (Spanish uses informal "tú", German informal "du", to match the site copy).
// Deliberately does not promise a specific reply time nobody is committed to;
// "during business hours" mirrors the site copy and nothing more. The internal
// team notification stays English (see notificationEmail).
const CONFIRMATION_COPY = {
  en: {
    subject: "We received your message",
    greetName: function (f) { return "Hi " + (f || "there"); },
    p1: "Thank you for reaching out to Innovaria Tech. Your message was received the moment you sent it, and it is already with our team.",
    p2: "A member of our team will follow up during business hours to schedule your free automation audit.",
    urgent: "If anything is urgent in the meantime, you can reach us directly:",
    phone: "Phone or WhatsApp: ",
    email: "Email: ",
    signoff: "Best regards,",
    team: "The Innovaria Tech Team",
  },
  es: {
    subject: "Hemos recibido tu mensaje",
    greetName: function (f) { return "Hola" + (f ? " " + f : ""); },
    p1: "Gracias por escribir a Innovaria Tech. Tu mensaje nos llegó en el momento en que lo enviaste y ya está con nuestro equipo.",
    p2: "Un miembro de nuestro equipo te responderá en horario laboral para agendar tu auditoría de automatización gratuita.",
    urgent: "Si mientras tanto surge algo urgente, puedes contactarnos directamente:",
    phone: "Teléfono o WhatsApp: ",
    email: "Email: ",
    signoff: "Un saludo,",
    team: "El equipo de Innovaria Tech",
  },
  de: {
    subject: "Wir haben deine Nachricht erhalten",
    greetName: function (f) { return "Hallo" + (f ? " " + f : ""); },
    p1: "Danke, dass du dich bei Innovaria Tech gemeldet hast. Deine Nachricht ist in dem Moment bei uns eingegangen, in dem du sie abgeschickt hast, und liegt bereits unserem Team vor.",
    p2: "Ein Mitglied unseres Teams meldet sich während der Geschäftszeiten bei dir, um deine kostenlose Automatisierungs-Analyse zu terminieren.",
    urgent: "Falls in der Zwischenzeit etwas dringend ist, erreichst du uns direkt:",
    phone: "Telefon oder WhatsApp: ",
    email: "E-Mail: ",
    signoff: "Beste Grüße,",
    team: "Dein Innovaria-Tech-Team",
  },
};

function confirmationEmail(lead, from) {
  const first = lead.name.split(" ")[0] || "";
  const t = CONFIRMATION_COPY[localeFromPage(lead.page)] || CONFIRMATION_COPY.en;
  const greeting = t.greetName(first) + ",";
  const text =
    greeting + "\n\n" +
    t.p1 + "\n\n" +
    t.p2 + "\n\n" +
    t.urgent + "\n" +
    t.phone + "+1 601 860 1258\n" +
    t.email + "info@innovariatech.space\n\n" +
    t.signoff + "\n" +
    t.team + "\n" +
    "https://innovariatech.space";
  const html =
    "<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a2233\">" +
    "<p>" + esc(greeting) + "</p>" +
    "<p>" + esc(t.p1) + "</p>" +
    "<p>" + esc(t.p2) + "</p>" +
    "<p style=\"background:#f4f6fb;border-left:3px solid #6d5efc;padding:10px 14px;border-radius:4px\">" +
    esc(t.urgent) + "<br>" +
    esc(t.phone) + "<a href=\"tel:+16018601258\">+1 601 860 1258</a><br>" +
    esc(t.email) + "<a href=\"mailto:info@innovariatech.space\">info@innovariatech.space</a></p>" +
    "<p style=\"color:#667\">" + esc(t.signoff) + "<br>" +
    esc(t.team) + "<br>" +
    "<a href=\"https://innovariatech.space\">innovariatech.space</a></p>" +
    "</div>";
  return {
    from: from,
    to: lead.email,
    subject: t.subject + (first ? ", " + first : ""),
    text: text,
    html: html,
  };
}

// Internal "new lead" notice to the team.
function notificationEmail(lead, from, to, stored) {
  const lines = [
    "New audit request from the website.",
    "",
    "Name:       " + lead.name,
    "Email:      " + lead.email,
    "Company:    " + lead.company,
    "Bottleneck: " + lead.bottleneck,
    "Page:       " + lead.page,
    "Received:   " + lead.at,
    "",
    stored
      ? "Stored in the leads portal: yes (see /admin.html)."
      : "Stored in the leads portal: NO - storage was unavailable, so this email is the only record. Follow up manually.",
  ];
  return {
    from: from,
    to: to,
    replyTo: lead.email,
    subject: "New audit request: " + lead.name + " (" + lead.company + ")",
    text: lines.join("\n"),
  };
}

function redisEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(command) {
  const env = redisEnv();
  const res = await fetch(env.url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    throw new Error("Redis request failed with status " + res.status);
  }
  const data = await res.json();
  return data.result;
}

function clean(value, max) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function isAdmin(req) {
  const auth = req.headers.authorization || "";
  const key = auth.replace(/^Bearer\s+/i, "").trim();
  return Boolean(process.env.ADMIN_KEY) && key === process.env.ADMIN_KEY;
}

// A real audit request describes a workflow; it does not paste links. A URL (or
// link markup) anywhere in the free-text fields is a near-certain spam bot
// (promo codes, link shorteners), so we drop it silently like the honeypot.
function isSpammy(lead) {
  const blob = (lead.name + " " + lead.company + " " + lead.bottleneck);
  if (/https?:\/\/|www\.[a-z0-9-]+\.[a-z]/i.test(blob)) return true; // any explicit link
  if (/\[url[=\]]|\[link[=\]]|<a\s+href/i.test(blob)) return true;   // bbcode / html link markup
  return false;
}

// The page a lead came from. The form always sends window.location.pathname; a
// bot POSTing straight to the API usually omits it, so fall back to the Referer
// header, and label anything with no context "direct" rather than leaving it blank.
function resolvePage(b, req) {
  const explicit = clean(b.page, 200);
  if (explicit) return explicit;
  const ref = req.headers.referer || req.headers.referrer || "";
  try { if (ref) return new URL(ref).pathname.slice(0, 200); } catch (e) { /* ignore */ }
  return "direct";
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "POST") {
      const b = req.body || {};

      // Honeypot: real visitors never fill the hidden "website" field.
      if (clean(b.website, 50) !== "") {
        return res.status(200).json({ ok: true });
      }

      const lead = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: clean(b.name, 120),
        email: clean(b.email, 160).toLowerCase(),
        company: clean(b.company, 160),
        bottleneck: clean(b.bottleneck, 2000),
        page: resolvePage(b, req),
        at: new Date().toISOString(),
      };

      if (lead.name.length < 2 || !validEmail(lead.email) || lead.company.length < 2 || lead.bottleneck.length < 10) {
        return res.status(400).json({ error: "Please fill every field with valid details." });
      }

      // Content spam filter. Drop links-in-message bots silently (200 so they do
      // not retry): no stored lead, no confirmation email, no team notification.
      if (isSpammy(lead)) {
        console.warn("[lead] dropped as spam:", lead.email, "|", lead.bottleneck.slice(0, 80));
        return res.status(200).json({ ok: true });
      }

      // 1) Store the lead (best-effort). A storage outage must not cost us the
      //    confirmation email the homepage promises, so we log and carry on.
      let stored = false;
      if (redisEnv()) {
        try {
          await redis(["LPUSH", LIST_KEY, JSON.stringify(lead)]);
          await redis(["LTRIM", LIST_KEY, 0, MAX_LEADS - 1]);
          stored = true;
        } catch (e) {
          console.error("[lead] storage failed:", e && e.message ? e.message : e);
        }
      } else {
        console.warn("[lead] storage not configured (no Upstash Redis env); relying on the notification email as the record.");
      }

      // 2) Send the instant confirmation to the sender and the internal notice.
      //    Each is independent and reported back so the form never claims a
      //    confirmation was emailed unless it actually was.
      let confirmationEmailed = false;
      let teamNotified = false;

      if (smtpConfigured()) {
        const from = process.env.MAIL_FROM || process.env.SMTP_USER;
        const notifyTo = process.env.LEAD_NOTIFY_TO || process.env.SMTP_USER;
        const transport = mailer();

        try {
          await transport.sendMail(confirmationEmail(lead, from));
          confirmationEmailed = true;
        } catch (e) {
          console.error("[lead] confirmation email to sender failed:", e && e.message ? e.message : e);
        }

        try {
          await transport.sendMail(notificationEmail(lead, from, notifyTo, stored));
          teamNotified = true;
        } catch (e) {
          console.error("[lead] internal notification email failed:", e && e.message ? e.message : e);
        }
      } else {
        console.warn("[lead] SMTP not configured (no SMTP_* env); no confirmation email sent.");
      }

      // A lead with neither a stored record nor any email that went out is a
      // real failure the visitor should not see as success.
      if (!stored && !confirmationEmailed && !teamNotified) {
        return res.status(502).json({
          error: "We could not process your request just now. Please email info@innovariatech.space directly.",
        });
      }

      return res.status(200).json({
        ok: true,
        stored: stored,
        confirmationEmailed: confirmationEmailed,
        teamNotified: teamNotified,
      });
    }

    if (req.method === "GET") {
      if (!redisEnv()) {
        return res.status(503).json({
          error: "Lead storage is not configured. Attach an Upstash Redis store to this Vercel project (see README).",
        });
      }
      if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
      const raw = (await redis(["LRANGE", LIST_KEY, 0, -1])) || [];
      const leads = raw
        .map(function (s) {
          try { return JSON.parse(s); } catch (e) { return null; }
        })
        .filter(Boolean);
      return res.status(200).json({ leads: leads });
    }

    if (req.method === "DELETE") {
      if (!redisEnv()) {
        return res.status(503).json({
          error: "Lead storage is not configured. Attach an Upstash Redis store to this Vercel project (see README).",
        });
      }
      if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
      const id = clean((req.query && req.query.id) || "", 40);
      if (!id) return res.status(400).json({ error: "Missing id" });
      const raw = (await redis(["LRANGE", LIST_KEY, 0, -1])) || [];
      const match = raw.find(function (s) {
        try { return JSON.parse(s).id === id; } catch (e) { return false; }
      });
      if (!match) return res.status(404).json({ error: "Lead not found" });
      await redis(["LREM", LIST_KEY, 1, match]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: "Storage error. Check the Vercel function logs." });
  }
};
