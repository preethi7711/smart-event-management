const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const Notification = require('../../models/Notification');

const DEV_LOG_PATH = path.join(__dirname, '..', '..', 'dev-emails.log');

let transporter = null;
let devMode = true;

function initTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    devMode = false;
    console.log('[email] SMTP configured. Live email sending enabled.');
  } else {
    devMode = true;
    console.log('[email] No SMTP credentials found. Running in DEVELOPMENT EMAIL MODE (emails logged, not sent).');
  }
}

initTransporter();

/**
 * Sends (or logs, in dev mode) an email and persists a Notification record.
 * Never throws — a failed/unavailable email must never crash a request.
 */
async function sendEmail({ to, subject, html, type, event = null, recipientUser = null }) {
  let status = 'DEV_LOGGED';
  let error = '';

  if (!devMode && transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'Smart Event Platform <no-reply@smartevents.dev>',
        to,
        subject,
        html,
      });
      status = 'SENT';
    } catch (err) {
      status = 'FAILED';
      error = err.message;
      console.warn(`[email] Failed to send to ${to}: ${err.message}`);
    }
  } else {
    const logLine = `\n[${new Date().toISOString()}] TO: ${to} | SUBJECT: ${subject}\n${html}\n${'-'.repeat(60)}\n`;
    try {
      fs.appendFileSync(DEV_LOG_PATH, logLine);
    } catch (e) {
      // non-fatal
    }
    console.log(`[email:dev-mode] -> ${to} | ${subject}`);
  }

  try {
    await Notification.create({
      recipientEmail: to,
      recipientUser,
      event,
      type,
      subject,
      body: html,
      status,
      error,
    });
  } catch (e) {
    console.warn('[email] failed to persist Notification record:', e.message);
  }

  return { status };
}

const templates = {
  registrationReceived: (attendeeName, eventTitle) => ({
    subject: `Registration received: ${eventTitle}`,
    html: `<p>Hi ${attendeeName},</p><p>We've received your registration for <strong>${eventTitle}</strong>. It's currently pending review.</p>`,
  }),
  registrationApproved: (attendeeName, eventTitle, checkInCode) => ({
    subject: `You're approved for ${eventTitle}!`,
    html: `<p>Hi ${attendeeName},</p><p>Your registration for <strong>${eventTitle}</strong> has been approved.</p><p>Your check-in code: <strong>${checkInCode}</strong></p>`,
  }),
  registrationRejected: (attendeeName, eventTitle, reason) => ({
    subject: `Update on your registration for ${eventTitle}`,
    html: `<p>Hi ${attendeeName},</p><p>Unfortunately your registration for <strong>${eventTitle}</strong> was not approved.${reason ? ` Reason: ${reason}` : ''}</p>`,
  }),
  eventUpdated: (attendeeName, eventTitle, changes) => ({
    subject: `Update: ${eventTitle}`,
    html: `<p>Hi ${attendeeName},</p><p><strong>${eventTitle}</strong> has been updated: ${changes}</p>`,
  }),
  scheduleUpdated: (attendeeName, eventTitle) => ({
    subject: `Schedule updated: ${eventTitle}`,
    html: `<p>Hi ${attendeeName},</p><p>The schedule for <strong>${eventTitle}</strong> has changed. Please check the latest agenda.</p>`,
  }),
  eventReminder: (attendeeName, eventTitle, startDate) => ({
    subject: `Reminder: ${eventTitle} is coming up`,
    html: `<p>Hi ${attendeeName},</p><p><strong>${eventTitle}</strong> starts on ${new Date(startDate).toDateString()}. We look forward to seeing you!</p>`,
  }),
};

module.exports = { sendEmail, templates, isDevMode: () => devMode };
