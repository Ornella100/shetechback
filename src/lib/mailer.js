import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});

export async function sendResetEmail(email, resetLink) {
  await transporter.sendMail({
    from: `"SheTech" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - SheTech',
    html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;">
      <h2 style="color:#C45C7A;">SheTech</h2><p>Bonjour,</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
      <p>Ce lien est valable <strong>1 heure</strong> :</p>
      <a href="${resetLink}" style="display:inline-block;background:#C45C7A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Réinitialiser mon mot de passe</a>
      <p style="color:#999;font-size:13px;">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      <p>— L'équipe SheTech</p></div>`,
  });
}
