import prisma from '../lib/prisma.js';
import { notifierAdminNouvelleDemandeSuivi, notifierMentorNouveauSuivi } from '../lib/mailer.js';
import { getIO } from '../lib/socket.js';

const includeDetails = {
  user: { select: { id: true, nom: true, email: true, telephone: true } },
  parcours: { select: { id: true, titre: true } },
  mentor: { select: { id: true, nom: true, email: true } },
};

function mapDemande(demande) {
  return {
    id: demande.id,
    statut: demande.statut,
    message_suivi: demande.messageSuivi,
    created_at: demande.createdAt,
    apprenante: demande.user,
    parcours: demande.parcours,
    mentor: demande.mentor,
  };
}

export async function mesDemandesMentorat(req, res) {
  try {
    const demandes = await prisma.demandeMentorat.findMany({
      where: { userId: req.user.id },
      include: includeDetails,
      orderBy: { createdAt: 'desc' },
    });
    res.json(demandes.map(mapDemande));
  } catch (error) {
    console.error('[Mentorat] Erreur chargement des demandes apprenante:', error);
    res.status(500).json({ message: 'Impossible de charger les demandes de suivi.' });
  }
}

export async function demanderSuiviMentorat(req, res) {
  const parcoursId = Number(req.body.parcours_id);
  if (req.user.role !== 'apprenante') return res.status(403).json({ message: 'Seules les apprenantes peuvent demander un suivi.' });
  if (!Number.isInteger(parcoursId) || parcoursId < 1) return res.status(400).json({ message: 'Choisissez un parcours valide.' });

  try {
    const [inscription, parcours] = await Promise.all([
      prisma.userParcours.findUnique({ where: { userId_parcoursId: { userId: req.user.id, parcoursId } } }),
      prisma.parcours.findUnique({ where: { id: parcoursId }, select: { id: true } }),
    ]);
    if (!parcours) return res.status(404).json({ message: 'Parcours introuvable.' });
    if (!inscription || !['actif', 'termine'].includes(inscription.statut))
      return res.status(403).json({ message: 'Choisissez d’abord ce parcours pour demander un suivi.' });

    const existing = await prisma.demandeMentorat.findUnique({ where: { userId_parcoursId: { userId: req.user.id, parcoursId } } });
    if (existing && !['refusee', 'annulee'].includes(existing.statut))
      return res.status(409).json({ message: 'Une demande de suivi existe déjà pour ce parcours.' });

    const demande = await prisma.demandeMentorat.upsert({
      where: { userId_parcoursId: { userId: req.user.id, parcoursId } },
      create: { userId: req.user.id, parcoursId },
      update: { statut: 'en_attente', mentorId: null, messageSuivi: null },
      include: includeDetails,
    });
    try {
      await notifierAdminNouvelleDemandeSuivi({ apprenante: demande.user, parcours: demande.parcours });
    } catch (emailError) {
      console.error('[Mentorat] Notification admin non envoyée:', emailError.message);
    }
    res.status(201).json({ message: 'Votre demande de suivi a été transmise à l’équipe SheTech.', demande: mapDemande(demande) });
  } catch (error) {
    console.error('[Mentorat] Erreur création demande:', error);
    res.status(500).json({ message: 'Impossible d’envoyer la demande de suivi.' });
  }
}

export async function demandesMentoratAdmin(_req, res) {
  try {
    const demandes = await prisma.demandeMentorat.findMany({ include: includeDetails, orderBy: { createdAt: 'desc' } });
    res.json(demandes.map(mapDemande));
  } catch (error) {
    console.error('[Mentorat] Erreur chargement admin:', error);
    res.status(500).json({ message: 'Impossible de charger les demandes de suivi.' });
  }
}

export async function attribuerMentor(req, res) {
  const demandeId = Number(req.params.id);
  const mentorId = Number(req.body.mentor_id);
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  if (!Number.isInteger(demandeId) || demandeId < 1 || !Number.isInteger(mentorId) || mentorId < 1)
    return res.status(400).json({ message: 'Sélectionnez une demande et une mentor valides.' });
  if (!message || message.length > 2000)
    return res.status(400).json({ message: 'Ajoutez un message de suivi (maximum 2 000 caractères).' });

  try {
    const mentor = await prisma.user.findFirst({ where: { id: mentorId, role: 'mentor' }, select: { id: true } });
    if (!mentor) return res.status(404).json({ message: 'Cette mentor est introuvable ou indisponible.' });
    const demande = await prisma.demandeMentorat.findUnique({ where: { id: demandeId }, include: includeDetails });
    if (!demande) return res.status(404).json({ message: 'Demande de suivi introuvable.' });
    if (['terminee', 'annulee'].includes(demande.statut))
      return res.status(409).json({ message: 'Cette demande est déjà clôturée.' });

    const updated = await prisma.demandeMentorat.update({
      where: { id: demandeId },
      data: { mentorId, statut: 'attribuee', messageSuivi: message },
      include: includeDetails,
    });
    const contenuMessage = `Nouveau suivi de mentorat\nApprenante : ${updated.user.nom}\nParcours : ${updated.parcours.titre}\nConsignes de suivi :\n${message}`;
    const messageCree = await prisma.message.create({
      data: { expediteurId: req.user.id, destinataireId: mentorId, contenu: contenuMessage },
    });
    getIO()?.to(`user:${mentorId}`).emit('message:direct', {
      otherUserId: req.user.id,
      message: { id: messageCree.id, contenu: messageCree.contenu, created_at: messageCree.createdAt, user_id: req.user.id },
    });
    let notificationEmail = false;
    try {
      notificationEmail = await notifierMentorNouveauSuivi({ mentor: updated.mentor, apprenante: updated.user, parcours: updated.parcours, message });
    } catch (emailError) {
      console.error('[Mentorat] Notification mentor non envoyée:', emailError.message);
    }
    res.json({
      message: notificationEmail
        ? 'La mentor a été attribuée et le message de suivi envoyé.'
        : 'La mentor a été attribuée. Le message est visible dans son espace ; l’e-mail de notification n’a pas pu être envoyé.',
      notification_email: notificationEmail,
      demande: mapDemande(updated),
    });
  } catch (error) {
    console.error('[Mentorat] Erreur attribution mentor:', error);
    res.status(500).json({ message: 'Impossible d’attribuer la mentor.' });
  }
}

export async function demandesMentoratMentor(req, res) {
  try {
    const demandes = await prisma.demandeMentorat.findMany({
      where: { mentorId: req.user.id },
      include: includeDetails,
      orderBy: { updatedAt: 'desc' },
    });
    res.json(demandes.map(mapDemande));
  } catch (error) {
    console.error('[Mentorat] Erreur chargement mentor:', error);
    res.status(500).json({ message: 'Impossible de charger vos suivis.' });
  }
}

export async function modifierDemandeMentoratMentor(req, res) {
  const statut = req.body.statut;
  if (!['en_cours', 'terminee'].includes(statut)) return res.status(400).json({ message: 'Statut de suivi invalide.' });
  try {
    const demande = await prisma.demandeMentorat.findFirst({ where: { id: Number(req.params.id), mentorId: req.user.id } });
    if (!demande) return res.status(404).json({ message: 'Suivi introuvable dans votre espace.' });
    if (demande.statut === 'terminee') return res.status(409).json({ message: 'Ce suivi est déjà terminé.' });
    const updated = await prisma.demandeMentorat.update({ where: { id: demande.id }, data: { statut } });
    res.json({ message: 'Statut du suivi mis à jour.', statut: updated.statut });
  } catch (error) {
    console.error('[Mentorat] Erreur mise à jour par mentor:', error);
    res.status(500).json({ message: 'Impossible de mettre à jour le suivi.' });
  }
}
