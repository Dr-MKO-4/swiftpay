// src/config/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOTPEmail(to, otp) {
  const mailOptions = {
    from: `"SwiftPay" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Votre code OTP',
    text: `Votre code de vérification est : ${otp}. Ce code est valide 5 minutes.`,
    html: `<h2>Code OTP</h2><p>Votre code de vérification est : <strong>${otp}</strong></p><p>Ce code expire dans 5 minutes.</p>`,
  };
  return transporter.sendMail(mailOptions);
}

async function sendPasswordResetEmail(to, resetLink) {
  const mailOptions = {
    from: `"SwiftPay" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Réinitialiser votre mot de passe SwiftPay',
    html: `
      <h2>Réinitialisation de mot de passe</h2>
      <p>Bonjour,</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe SwiftPay.</p>
      <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Réinitialiser mon mot de passe</a></p>
      <p>Ou copiez ce lien : <code>${resetLink}</code></p>
      <p><strong>Ce lien expire dans 1 heure.</strong></p>
      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      <p>Cordialement,<br>L'équipe SwiftPay</p>
    `,
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendOTPEmail, sendPasswordResetEmail };
