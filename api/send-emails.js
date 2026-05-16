// api/send-emails.js — Vercel Serverless Function
// POST /api/send-emails
//
// Each user provides their OWN email + app password.
// Emails are sent FROM their email address (e.g. events@gitam.edu).
// Credentials are NEVER stored — used once per request, then discarded.

import nodemailer from "nodemailer";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const {
    recipients,     // [{ name, email, certId, verifyUrl }]
    issuerName,     // "GITAM · Shore26" or any institution name
    eventName,      // "6-Hour Hackathon" or any event
    portalUrl,      // "https://yourapp.com/portal"
    senderEmail,    // user's email — "events@gitam.edu", "you@gmail.com", anything
    senderPassword, // Gmail App Password, or SMTP password
    smtpHost: customHost, // optional — if auto-detection fails
    smtpPort: customPort, // optional — default 587
  } = req.body;

  // Validate required fields
  if (!recipients?.length)  return res.status(400).json({ error: "No recipients provided." });
  if (!senderEmail)         return res.status(400).json({ error: "Sender email is required." });
  if (!senderPassword)      return res.status(400).json({ error: "App password is required." });

  // ── Detect SMTP config ──────────────────────────────────────────────────

  const domain = senderEmail.split("@")[1]?.toLowerCase() || "";

  let smtpConfig;

  if (customHost) {
    // User manually entered their SMTP host (Advanced Settings)
    smtpConfig = {
      host:   customHost,
      port:   customPort || 587,
      secure: customPort === 465,
      auth:   { user: senderEmail, pass: senderPassword },
      tls:    { rejectUnauthorized: false },
    };
  } else if (domain === "gmail.com" || domain === "googlemail.com") {
    smtpConfig = { service: "gmail",   auth: { user: senderEmail, pass: senderPassword } };
  } else if (["outlook.com","hotmail.com","live.com","msn.com"].includes(domain)) {
    smtpConfig = { service: "hotmail", auth: { user: senderEmail, pass: senderPassword } };
  } else if (domain === "yahoo.com" || domain === "yahoo.in") {
    smtpConfig = { service: "yahoo",   auth: { user: senderEmail, pass: senderPassword } };
  } else if (domain === "zoho.com") {
    smtpConfig = { host: "smtp.zoho.com", port: 587, secure: false, auth: { user: senderEmail, pass: senderPassword } };
  } else {
    // Any other institution / university — auto-guess SMTP host from domain
    // e.g. events@bits.edu → smtp.bits.edu
    // If this fails, the user can use "Advanced Settings" in the modal to set it manually
    smtpConfig = {
      host:   `smtp.${domain}`,
      port:   587,
      secure: false,
      auth:   { user: senderEmail, pass: senderPassword },
      tls:    { rejectUnauthorized: false },
    };
  }

  // Create transporter with the user's credentials
  let transporter;
  try {
    transporter = nodemailer.createTransport(smtpConfig);
    await transporter.verify(); // Test the connection before sending
  } catch (err) {
    return res.status(401).json({
      error: `Could not connect to email server: ${err.message}. Check your email and app password.`,
    });
  }

  // ── Send emails ────────────────────────────────────────────────────────────
  const results = { sent: 0, failed: 0, errors: [] };

  for (const r of recipients) {
    if (!r.email || !r.name) { results.failed++; continue; }

    const shortId = r.certId?.slice(0, 8).toUpperCase() || "N/A";

    try {
      await transporter.sendMail({
        from:    `"${issuerName || "CertifyPro"}" <${senderEmail}>`,
        to:      r.email,
        subject: `Your Certificate — ${eventName || "Certificate"}`,
        html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#06080f;font-family:Arial,sans-serif;color:#dde4f0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#06080f;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#0d1018;border:1px solid #1e2535;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0d1018,#131720);padding:28px 40px;border-bottom:1px solid #1e2535;">
    <span style="font-size:1.4rem;color:#f5c842;">⬡</span>
    <span style="font-size:1.1rem;font-weight:800;color:#fff;margin-left:8px;">
      Certify<span style="color:#f5c842;">Pro</span>
    </span>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px;">
    <h1 style="font-size:1.7rem;font-weight:900;margin:0 0 10px;color:#fff;">
      🎓 Congratulations, ${r.name}!
    </h1>
    <p style="color:#8892a4;font-size:0.95rem;margin:0 0 24px;line-height:1.6;">
      Your certificate for
      <strong style="color:#f5c842;">${eventName || "the event"}</strong>
      has been issued by
      <strong style="color:#e8eaf0;">${issuerName || "your organization"}</strong>.
    </p>

    <!-- Certificate ID Box -->
    <div style="background:#131720;border:1px solid #1e2535;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <div style="font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:#5a6478;margin-bottom:8px;">
        Your Certificate ID
      </div>
      <div style="font-family:monospace;font-size:2rem;font-weight:900;color:#f5c842;letter-spacing:0.1em;">
        ${shortId}
      </div>
      <div style="font-size:0.75rem;color:#5a6478;margin-top:6px;">
        Use this ID on the participant portal to view your certificate
      </div>
    </div>

    <!-- CTA Buttons -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td align="center" style="padding:6px;">
        <a href="${r.verifyUrl}"
           style="display:inline-block;background:#f5c842;color:#000;font-weight:700;
                  font-size:0.95rem;padding:14px 32px;border-radius:10px;text-decoration:none;
                  width:100%;max-width:280px;text-align:center;box-sizing:border-box;">
          ✅ View &amp; Verify My Certificate
        </a>
      </td></tr>
      ${portalUrl ? `
      <tr><td align="center" style="padding:6px;">
        <a href="${portalUrl}"
           style="display:inline-block;background:transparent;color:#f5c842;font-weight:600;
                  font-size:0.9rem;padding:12px 32px;border-radius:10px;text-decoration:none;
                  border:1px solid rgba(245,200,66,0.35);width:100%;max-width:280px;
                  text-align:center;box-sizing:border-box;">
          🔍 Search on Participant Portal
        </a>
      </td></tr>` : ""}
    </table>

    <p style="font-size:0.82rem;color:#5a6478;line-height:1.6;margin:0;">
      You can verify your certificate at any time by scanning the QR code on the PDF,
      clicking the link above, or entering your ID <strong style="color:#8892a4;">${shortId}</strong>
      on the participant portal.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 40px;border-top:1px solid #1e2535;text-align:center;">
    <p style="font-size:0.75rem;color:#5a6478;margin:0;">
      Issued via <strong style="color:#f5c842;">CertifyPro</strong> ·
      Sent by <em>${issuerName || "your organization"}</em>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`,
      });

      results.sent++;
      await sleep(300); // Small delay to avoid rate limits

    } catch (err) {
      results.failed++;
      results.errors.push(`${r.name} (${r.email}): ${err.message}`);
    }
  }

  return res.status(200).json({ success: true, ...results });
}
