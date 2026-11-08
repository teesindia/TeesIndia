/**
 * backend/src/lib/mailer.ts
 *
 * Nodemailer singleton — call sendMail() to send any transactional email.
 * Configure via environment variables:
 *   SMTP_HOST   e.g. smtp.gmail.com
 *   SMTP_PORT   e.g. 587
 *   SMTP_USER   e.g. yourname@gmail.com
 *   SMTP_PASS   e.g. 16-char Gmail App Password (or Brevo/Resend API key)
 *   SMTP_FROM   e.g. "TEESINDIA <yourname@gmail.com>"
 */

const RESEND_API = 'https://api.resend.com';

export async function verifySMTP(): Promise<{ success: boolean; message: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, message: 'RESEND_API_KEY is missing in the backend environment.' };
  }
  try {
    const response = await fetch(`${RESEND_API}/domains`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return { success: false, message: `Email API verification failed (${response.status}).` };
    return { success: true, message: 'Email API credentials verified successfully.' };
  } catch (err: any) {
    console.error('[mailer] Email API verification failed:', err);
    return {
      success: false,
      message: process.env.NODE_ENV === 'development'
        ? err?.message || 'Failed to verify email API credentials.'
        : 'Email configuration could not be verified.',
    };
  }
}

export async function sendMail(opts: {
  to:      string;
  subject: string;
  html:    string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    console.warn('[mailer] RESEND_API_KEY or RESEND_FROM not set — skipping email to:', opts.to);
    return;
  }
  const response = await fetch(`${RESEND_API}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
  });
  if (!response.ok) throw new Error(`Email API request failed (${response.status}): ${await response.text()}`);
}
