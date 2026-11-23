// ---------------------------------------------------------------------------
// mailer.js — actually sends email, through Nodemailer.
//
// A "transport" is a reusable connection to a mail server. Created once and
// shared, so we are not opening a new SMTP connection for every message.
//
// This talks to a REAL mail server using the credentials in .env. Nothing
// here is faked or simulated — if it reports success, a message was handed
// to the mail provider.
// ---------------------------------------------------------------------------
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transport = null;

// Set MAIL_TRANSPORT=capture to keep messages in memory instead of sending
// them. This exists for the automated tests, which assert on the rendered
// email — including the code inside it. It uses nodemailer's own built-in
// jsonTransport, so the message is composed for real; only the final SMTP
// handover is skipped.
//
// Never set this in .env. Normal runs send real mail.
export const capturedMails = [];
const isCapture = () => process.env.MAIL_TRANSPORT === 'capture';

function getTransport() {
  if (transport) return transport;

  if (isCapture()) {
    transport = nodemailer.createTransport({ jsonTransport: true });
    return transport;
  }

  transport = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    // Port 587 starts unencrypted then upgrades to TLS (STARTTLS), which is
    // what `secure: false` means here. Port 465 is encrypted from the first
    // byte and needs `secure: true`.
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });

  return transport;
}

/**
 * Check the mail credentials without sending anything.
 * Called at startup so a wrong app password shows up immediately, rather
 * than silently failing on a user's first registration.
 */
export async function verifyMailer() {
  if (isCapture()) return { ok: true, captured: true };
  try {
    await getTransport().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

export async function sendMail({ to, subject, text, html }) {
  const info = await getTransport().sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.fromAddress}>`,
    to,
    subject,
    text,
    html,
  });

  if (isCapture()) capturedMails.push({ to, subject, text, html });

  return info;
}
