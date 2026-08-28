/**
 * Vercel serverless function: send a reply email to a lead from the admin panel.
 *
 * POST /api/reply    { to, subject, message, leadId }
 *   Requires Authorization: Bearer <ADMIN_KEY> (same key as the leads portal).
 *   Sends the message from the site mailbox to the lead, then best-effort marks
 *   the stored lead as replied so the panel can show reply history.
 *
 * Environment variables: the SMTP_* / MAIL_FROM set documented in .env.example,
 * plus ADMIN_KEY, and the Upstash Redis pair used by api/lead.js.
 */

const { smtpConfigured, mailer, mailFrom } = require("./_mailer");

const LIST_KEY = "innovaria:leads";

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

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Turn a plain-text message (with line breaks) into simple, safe HTML.
function textToHtml(message) {
  const paras = String(message).replace(/\r\n/g, "\n").split(/\n{2,}/);
  const body = paras
    .map(function (p) {
      return "<p style=\"margin:0 0 14px\">" + esc(p).replace(/\n/g, "<br>") + "</p>";
    })
    .join("");
  return (
    "<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a2233\">" +
    body +
    "</div>"
  );
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!isAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!smtpConfigured()) {
    return res.status(503).json({ error: "Email is not configured. Set the SMTP_* environment variables in Vercel." });
  }

  const b = req.body || {};
  const to = clean(b.to, 160).toLowerCase();
  const subject = clean(b.subject, 200);
  const message = String(b.message == null ? "" : b.message).slice(0, 10000).trim();
  const leadId = clean(b.leadId, 40);

  if (!validEmail(to)) return res.status(400).json({ error: "A valid recipient email is required." });
  if (subject.length < 2) return res.status(400).json({ error: "Please add a subject." });
  if (message.length < 2) return res.status(400).json({ error: "Please write a message before sending." });

  // 1) Send the reply. This is the whole point of the endpoint, so a failure
  //    here is a real error the admin must see.
  try {
    const from = mailFrom();
    const transport = mailer();
    await transport.sendMail({
      from: from,
      to: to,
      replyTo: from,
      subject: subject,
      text: message,
      html: textToHtml(message),
    });
  } catch (e) {
    console.error("[reply] send failed:", e && e.message ? e.message : e);
    return res.status(502).json({ error: "The email could not be sent. Please try again in a moment." });
  }

  // 2) Best-effort: record the reply on the stored lead so the panel can show
  //    who has already been answered. A failure here does not undo the sent mail.
  let marked = false;
  const sentAt = new Date().toISOString();
  if (leadId && redisEnv()) {
    try {
      const raw = (await redis(["LRANGE", LIST_KEY, 0, -1])) || [];
      for (let i = 0; i < raw.length; i++) {
        let lead;
        try { lead = JSON.parse(raw[i]); } catch (e) { continue; }
        if (lead && lead.id === leadId) {
          lead.replies = Array.isArray(lead.replies) ? lead.replies : [];
          lead.replies.push({ at: sentAt, subject: subject });
          lead.lastRepliedAt = sentAt;
          await redis(["LSET", LIST_KEY, i, JSON.stringify(lead)]);
          marked = true;
          break;
        }
      }
    } catch (e) {
      console.error("[reply] could not mark lead as replied:", e && e.message ? e.message : e);
    }
  }

  return res.status(200).json({ ok: true, marked: marked, at: sentAt });
};
