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
    const { cause, hint } = diagnose(err);
    return { ok: false, message: err.message, cause, hint };
  }
}

/**
 * Turn an SMTP failure into a sentence that names the actual cause.
 *
 * "Invalid login: 535 5.7.8 Authentication failed" tells you nothing about
 * WHICH setting is wrong. This maps the common codes to the setting at
 * fault, so a failure points straight at the line to fix.
 *
 * It never includes the password, and it shows the username only partly.
 */
function diagnose(err) {
  const code = err?.responseCode || err?.code || '';
  const text = String(err?.message || '');

  if (code === 'EAUTH' || /\b535\b/.test(text) || /auth/i.test(text)) {
    return {
      cause: 'SMTP_USER or SMTP_PASS is wrong — the mail server rejected the login.',
      hint: env.smtp.host.includes('brevo')
        ? 'Brevo\'s login is its own address (like 9a1b2c@smtp-brevo.com), not your own email. The password is the generated SMTP key.'
        : 'For Gmail this must be a 16-character app password, not your normal password.',
    };
  }
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'ENOTFOUND'].includes(code)) {
    return {
      cause: `Could not reach ${env.smtp.host}:${env.smtp.port}.`,
      hint: 'Check SMTP_HOST and SMTP_PORT, and that a firewall is not blocking the port.',
    };
  }
  if (code === 'EENVELOPE' || /\b550\b|\b553\b/.test(text)) {
    return {
      cause: `The server refused the sender or recipient address.`,
      hint: `MAIL_FROM_ADDRESS (${env.smtp.fromAddress}) usually has to be verified with the provider before it can send.`,
    };
  }
  if (/\b554\b|\b421\b/.test(text)) {
    return {
      cause: 'The mail provider blocked or throttled the message.',
      hint: 'Often a sending-quota limit, or the account is not fully activated yet.',
    };
  }
  return { cause: 'The mail server rejected the message.', hint: '' };
}

export async function sendMail({ to, subject, text, html }) {
  try {
    const info = await getTransport().sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.fromAddress}>`,
      to,
      subject,
      text,
      html,
    });

    if (isCapture()) capturedMails.push({ to, subject, text, html });

    return info;
  } catch (err) {
    const { cause, hint } = diagnose(err);

    // Logged for you, on the server. Note what is NOT here: no password, no
    // verification code, and only part of the username. Logs get copied into
    // bug reports and shipped to log services, so they must stay safe to share.
    const maskedUser = String(env.smtp.user || '').replace(/^(.{2}).*(@.*)$/, '$1***$2');
    console.error('\n  EMAIL FAILED — nothing was delivered.');
    console.error(`    to       : ${to}`);
    console.error(`    server   : ${env.smtp.host}:${env.smtp.port}`);
    console.error(`    login    : ${maskedUser || '(not set)'}`);
    console.error(`    from     : ${env.smtp.fromAddress}`);
    console.error(`    smtp code: ${err?.responseCode || err?.code || 'unknown'}`);
    console.error(`    cause    : ${cause}`);
    if (hint) console.error(`    fix      : ${hint}`);
    console.error('');

    // Re-thrown so the caller knows delivery failed and can refuse to
    // report success. `userMessage` is the part that is safe to show.
    err.userMessage = cause;
    err.isMailFailure = true;
    throw err;
  }
}
