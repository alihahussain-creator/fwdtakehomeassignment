const nodemailer = require('nodemailer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { email: cfg } = require('../config');

async function sendReport(jiraKey, bugReport, screenshots, overall) {
  const subject = `QA Report — ${jiraKey} — ${overall}`;

  if (cfg.resendApiKey) {
    await sendViaResend(subject, bugReport, screenshots);
  } else {
    await sendViaSMTP(subject, bugReport, screenshots);
  }
}

async function sendViaSMTP(subject, body, attachments) {
  const transporter = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpPort === 465,
    auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
  });

  const mailAttachments = attachments
    .filter(p => fs.existsSync(p))
    .map(p => ({ filename: path.basename(p), path: p }));

  await transporter.sendMail({
    from: cfg.from,
    to: cfg.to,
    subject,
    text: body,
    attachments: mailAttachments,
  });

  console.log(`    ✓ Email sent via SMTP to ${cfg.to}`);
}

async function sendViaResend(subject, body, attachments) {
  const attachmentList = attachments
    .filter(p => fs.existsSync(p))
    .map(p => ({
      filename: path.basename(p),
      content: fs.readFileSync(p).toString('base64'),
    }));

  await axios.post(
    'https://api.resend.com/emails',
    { from: cfg.from, to: [cfg.to], subject, text: body, attachments: attachmentList },
    { headers: { Authorization: `Bearer ${cfg.resendApiKey}` } }
  );

  console.log(`    ✓ Email sent via Resend to ${cfg.to}`);
}

module.exports = { sendReport };
