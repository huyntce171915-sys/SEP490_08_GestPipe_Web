const nodemailer = require('nodemailer');
const smtpConfig = require('../config/smtp');

const transporter = nodemailer.createTransport({
  host: smtpConfig.host,
  port: smtpConfig.port,
  secure: smtpConfig.secure,
  auth: smtpConfig.auth
});

function sendMail({ to, subject, text, html }) {
  return transporter.sendMail({
    from: smtpConfig.from,
    to,
    subject,
    text,
    html
  });
}

module.exports = { sendMail };
