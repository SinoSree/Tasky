// ---------------------------------------------------------------------------
// otpEmail.js — the branded email a user receives.
//
// Email HTML is not web HTML. Mail clients (especially Outlook) ignore most
// modern CSS, so the rules are old-fashioned on purpose:
//   - tables for layout, not flexbox or grid
//   - inline styles, because <style> blocks are often stripped
//   - no external images, so nothing is blocked by default
//
// Every email also carries a plain-text version. Some clients show it, some
// people prefer it, and spam filters trust messages that include one.
// ---------------------------------------------------------------------------

const BLUE = '#2563eb';
const INK = '#111827';
const MUTED = '#6b7280';
const BORDER = '#e8eaee';

export function buildOtpEmail({ username, code, ttlMinutes }) {
  const subject = `${code} is your Taskly verification code`;

  const text = [
    `Hi ${username},`,
    '',
    `Your Taskly verification code is ${code}`,
    '',
    `It expires in ${ttlMinutes} minutes and can only be used once.`,
    '',
    'If you did not create a Taskly account, you can ignore this email.',
    '',
    '— Taskly',
  ].join('\n');

  // Letter-spacing the digits makes a 6-digit code far easier to read and
  // retype correctly.
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;">
  <!-- Preview text: what the inbox shows before opening. Hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your code is ${code}. It expires in ${ttlMinutes} minutes.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:480px;background:#ffffff;border:1px solid ${BORDER};border-radius:14px;overflow:hidden;">

          <!-- Brand -->
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;height:36px;background:${BLUE};border-radius:9px;text-align:center;
                             color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:19px;font-weight:bold;
                             line-height:36px;">T</td>
                  <td style="padding-left:11px;font-family:Helvetica,Arial,sans-serif;
                             font-size:16px;font-weight:bold;color:${INK};">Taskly</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding:24px 32px 0 32px;font-family:Helvetica,Arial,sans-serif;">
              <h1 style="margin:0 0 10px 0;font-size:20px;line-height:1.3;color:${INK};">
                Confirm your email
              </h1>
              <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
                Hi ${username}, enter this code in Taskly to finish setting up your account.
              </p>
            </td>
          </tr>

          <!-- The code -->
          <tr>
            <td style="padding:22px 32px 0 32px;">
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;
                          padding:20px;text-align:center;">
                <div style="font-family:'Courier New',Courier,monospace;font-size:34px;
                            font-weight:bold;letter-spacing:9px;color:${BLUE};">${code}</div>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 0 32px;font-family:Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
                This code expires in <strong style="color:${INK};">${ttlMinutes} minutes</strong>
                and can be used once.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 32px 28px 32px;">
              <div style="border-top:1px solid ${BORDER};padding-top:16px;
                          font-family:Helvetica,Arial,sans-serif;font-size:12px;
                          line-height:1.6;color:#9ca3af;">
                Didn't create a Taskly account? You can safely ignore this email —
                nobody can access the account without this code.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
