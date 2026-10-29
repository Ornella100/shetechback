import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export async function notifierAdminNouvelleDemandeMentorat({ apprenante, mentor, dateSession, type, sujet }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !process.env.GMAIL_USER || !process.env.GMAIL_PASS) return false;
  await transporter.sendMail({
    from: `"SheTech" <${process.env.GMAIL_USER}>`,
    to: adminEmail,
    subject: `Nouvelle demande de mentorat — ${apprenante.nom}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#2B1B24">
      <h2 style="color:#C45C7A">Nouvelle demande de mentorat</h2>
      <p><strong>Apprenante :</strong> ${escapeHtml(apprenante.nom)} (${escapeHtml(apprenante.email)})</p>
      <p><strong>Téléphone :</strong> ${escapeHtml(apprenante.telephone || 'Non renseigné')}</p>
      <p><strong>Mentor :</strong> ${escapeHtml(mentor.nom)}</p>
      <p><strong>Créneau :</strong> ${escapeHtml(new Date(dateSession).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }))}</p>
      <p><strong>Format :</strong> ${escapeHtml(type)}</p>
      <p><strong>Sujet :</strong> ${escapeHtml(sujet || 'Non précisé')}</p>
      <p>Connectez-vous à la console SheTech pour confirmer ou refuser cette demande.</p>
    </div>`,
  });
  return true;
}

export async function notifierApprenanteDecisionMentorat({ email, nom, statut, mentor, dateSession, lienReunion }) {
  if (!email || !process.env.GMAIL_USER || !process.env.GMAIL_PASS) return false;
  const confirmee = statut === 'confirmee';
  await transporter.sendMail({
    from: `"SheTech" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: confirmee ? 'Votre session de mentorat est confirmée' : 'Réponse à votre demande de mentorat',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#2B1B24">
      <h2 style="color:#C45C7A">Bonjour ${escapeHtml(nom)},</h2>
      <p>Votre demande de mentorat a été <strong>${confirmee ? 'confirmée' : 'refusée'}</strong>.</p>
      <p><strong>Mentor :</strong> ${escapeHtml(mentor || 'Votre mentor')}</p>
      <p><strong>Créneau demandé :</strong> ${escapeHtml(new Date(dateSession).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }))}</p>
      ${confirmee && lienReunion ? `<p><a href="${escapeHtml(lienReunion)}">Ouvrir le lien de réunion</a></p>` : ''}
      <p>Retrouvez les informations à jour dans votre espace SheTech.</p>
    </div>`,
  });
  return true;
}

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
