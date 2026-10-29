import prisma from '../lib/prisma.js';
import { notifierAdminNouvelleDemandeMentorat, notifierApprenanteDecisionMentorat } from '../lib/mailer.js';

function normalizeStatut(statut) {
  if (!statut || statut === 'reserve' || statut === 'réservé') return 'réservé';
  if (statut === 'termine' || statut === 'terminé') return 'terminee';
  return null;
}

function mapSession(s) {
  return {
    ...s,
    mentor_id: s.mentorId, user_id: s.userId,
    date_session: s.dateSession, lien_reunion: s.lienReunion,
    mentor_nom: s.mentor?.nom, apprenant_nom: s.user?.nom,
  };
}

const DUREE_SESSION_MINUTES = 60;

async function mentorDejaReserve(mentorId, dateSession, excludeId) {
  const marge = DUREE_SESSION_MINUTES * 60 * 1000;
  return prisma.sessionMentorat.findFirst({
    where: {
      mentorId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      statut: { in: ['en_attente', 'réservé', 'confirmee'] },
      dateSession: { gt: new Date(dateSession.getTime() - marge), lt: new Date(dateSession.getTime() + marge) },
    },
    select: { id: true },
  });
}

export const getMentors = async (_req, res) => {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: 'mentor' },
      select: { id: true, nom: true, niveau: true },
    });
    res.json(mentors);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getSessions = async (req, res) => {
  try {
    const sessions = await prisma.sessionMentorat.findMany({
      where: { userId: req.user.id },
      orderBy: { dateSession: 'desc' },
      include: { mentor: { select: { nom: true } } },
    });
    res.json(sessions.map(mapSession));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createSession = async (req, res) => {
  const { mentor_id, date_session, type, sujet } = req.body;
  if (!mentor_id || !date_session || !type)
    return res.status(400).json({ message: 'mentor_id, date_session et type sont obligatoires' });
  if (req.user.role !== 'apprenante')
    return res.status(403).json({ message: 'Seules les apprenantes peuvent demander une session de mentorat' });
  if (!Number.isInteger(Number(mentor_id)) || !['individuel', 'groupe'].includes(type))
    return res.status(400).json({ message: 'Mentor ou format de session invalide' });
  const dateSession = new Date(date_session);
  if (Number.isNaN(dateSession.getTime()) || dateSession <= new Date())
    return res.status(400).json({ message: 'Choisissez une date future valide' });
  try {
    const mentor = await prisma.user.findFirst({ where: { id: Number(mentor_id), role: 'mentor' }, select: { id: true } });
    if (!mentor) return res.status(404).json({ message: 'Mentor introuvable' });
    if (await mentorDejaReserve(mentor.id, dateSession))
      return res.status(409).json({ message: 'Ce créneau chevauche une autre session. Choisissez une autre heure.' });
    const s = await prisma.sessionMentorat.create({
      data: { mentorId: Number(mentor_id), userId: req.user.id, dateSession, type, sujet: sujet || null, statut: 'en_attente' },
    });
    const [apprenante, mentorInfo] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.id }, select: { nom: true, email: true, telephone: true } }),
      prisma.user.findUnique({ where: { id: Number(mentor_id) }, select: { nom: true } }),
    ]);
    try { await notifierAdminNouvelleDemandeMentorat({ apprenante, mentor: mentorInfo, dateSession, type, sujet }); }
    catch (emailError) { console.error('[Mentorat] Notification admin non envoyée:', emailError.message); }
    res.status(201).json({ message: 'Session réservée', id: s.id });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /mentor/sessions — agenda de la mentor connectée
export const getMentorSessions = async (req, res) => {
  try {
    const sessions = await prisma.sessionMentorat.findMany({
      where: req.user.role === 'admin' ? undefined : { mentorId: req.user.id },
      orderBy: { dateSession: 'asc' },
      include: { mentor: { select: { nom: true } }, user: { select: { nom: true } } },
    });
    res.json(sessions.map((s) => ({ ...mapSession(s), apprenant_nom: s.user?.nom })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /mentor/sessions/:id — la mentor confirme/refuse/termine sa session
export const updateMentorSession = async (req, res) => {
  const { statut, notes, lien_reunion } = req.body;
  if (!['confirmee', 'refusee', 'terminee'].includes(statut))
    return res.status(400).json({ message: 'Statut de session invalide' });
  try {
    const session = await prisma.sessionMentorat.findUnique({ where: { id: Number(req.params.id) } });
    if (!session) return res.status(404).json({ message: 'Session introuvable' });
    if (req.user.role !== 'admin' && session.mentorId !== req.user.id)
      return res.status(403).json({ message: 'Cette session ne vous est pas attribuée' });
    if (statut === 'confirmee' && !['en_attente', 'réservé', 'confirmee'].includes(session.statut))
      return res.status(409).json({ message: 'Cette demande ne peut plus être confirmée' });
    if (statut === 'refusee' && !['en_attente', 'réservé'].includes(session.statut))
      return res.status(409).json({ message: 'Cette demande a déjà reçu une réponse' });
    if (statut === 'terminee' && session.statut !== 'confirmee')
      return res.status(409).json({ message: 'Confirmez la session avant de la terminer' });
    if (statut === 'terminee' && session.dateSession > new Date())
      return res.status(409).json({ message: 'Une session ne peut être terminée avant son créneau' });
    if (!['en_attente', 'réservé', 'confirmee'].includes(session.statut))
      return res.status(409).json({ message: 'Cette session a déjà été clôturée ou refusée' });
    await prisma.sessionMentorat.update({
      where: { id: session.id },
      data: {
        statut,
        notes: notes === undefined ? session.notes : (notes || null),
        lienReunion: lien_reunion === undefined ? session.lienReunion : (lien_reunion || null),
      },
    });
    res.json({ message: 'Session mise à jour' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /sessions/:id/annuler — l’apprenante peut annuler une session avant son créneau
export const annulerMaSession = async (req, res) => {
  try {
    const session = await prisma.sessionMentorat.findFirst({
      where: { id: Number(req.params.id), userId: req.user.id },
    });
    if (!session) return res.status(404).json({ message: 'Session introuvable' });
    if (!['en_attente', 'réservé', 'confirmee'].includes(session.statut))
      return res.status(409).json({ message: 'Cette session ne peut plus être annulée' });
    if (session.dateSession <= new Date())
      return res.status(409).json({ message: 'Le créneau de cette session est déjà passé' });
    await prisma.sessionMentorat.update({ where: { id: session.id }, data: { statut: 'annulee' } });
    res.json({ message: 'Session annulée' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const reserverSession = async (req, res) => {
  const { mentor_id, sujet, message } = req.body;
  if (req.user.role !== 'apprenante')
    return res.status(403).json({ message: 'Seules les apprenantes peuvent demander une session de mentorat' });
  if (!mentor_id) return res.status(400).json({ message: 'mentor_id est obligatoire' });
  try {
    const mentor = await prisma.user.findFirst({ where: { id: Number(mentor_id), role: 'mentor' }, select: { id: true } });
    if (!mentor) return res.status(404).json({ message: 'Mentor introuvable' });
    const s = await prisma.sessionMentorat.create({
      data: { mentorId: Number(mentor_id), userId: req.user.id, dateSession: new Date(), type: 'individuel', sujet: sujet || null, notes: message || null },
    });
    const [apprenanteInfo, mentorInfo] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.id }, select: { nom: true, email: true, telephone: true } }),
      prisma.user.findUnique({ where: { id: Number(mentor_id) }, select: { nom: true } }),
    ]);
    try { await notifierAdminNouvelleDemandeMentorat({ apprenante: apprenanteInfo, mentor: mentorInfo, dateSession: s.dateSession, type: s.type, sujet: s.sujet }); }
    catch (emailError) { console.error('[Mentorat] Notification admin non envoyée:', emailError.message); }
    res.status(201).json({ message: 'Session réservée', id: s.id });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getAdminSessions = async (req, res) => {
  try {
    const sessions = await prisma.sessionMentorat.findMany({
      orderBy: { dateSession: 'desc' },
      include: {
        user: { select: { nom: true, email: true, telephone: true } },
        mentor: { select: { nom: true, email: true } },
      },
    });
    res.json(sessions.map(s => ({ ...mapSession(s), apprenant_nom: s.user?.nom })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createAdminSession = async (req, res) => {
  const { mentor_id, user_id, date_session, type, sujet, lien_reunion } = req.body;
  if (!mentor_id || !user_id || !date_session || !type)
    return res.status(400).json({ message: 'mentor_id, user_id, date_session et type sont obligatoires' });
  if (!Number.isInteger(Number(mentor_id)) || !Number.isInteger(Number(user_id)) || !['individuel', 'groupe'].includes(type))
    return res.status(400).json({ message: 'Mentor, apprenante ou format de session invalide' });
  try {
    const dateSession = new Date(date_session);
    if (Number.isNaN(dateSession.getTime()) || dateSession <= new Date())
      return res.status(400).json({ message: 'Choisissez une date future valide' });
    const mentor = await prisma.user.findFirst({ where: { id: Number(mentor_id), role: 'mentor' }, select: { id: true } });
    if (!mentor) return res.status(404).json({ message: 'Mentor introuvable' });
    const apprenante = await prisma.user.findFirst({ where: { id: Number(user_id), role: 'apprenante' }, select: { id: true } });
    if (!apprenante) return res.status(404).json({ message: 'Apprenante introuvable' });
    if (await mentorDejaReserve(mentor.id, dateSession))
      return res.status(409).json({ message: 'Ce créneau chevauche une autre session. Choisissez une autre heure.' });
    const s = await prisma.sessionMentorat.create({
      data: { mentorId: Number(mentor_id), userId: Number(user_id), dateSession, type, sujet: sujet || null, lienReunion: lien_reunion || null, statut: 'confirmee' },
    });
    res.status(201).json({ message: 'Session créée', id: s.id });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateAdminSession = async (req, res) => {
  const { statut, notes, lien_reunion, sujet } = req.body;
  const statutNorm = ['en_attente', 'confirmee', 'refusee', 'annulee', 'terminee'].includes(statut)
    ? statut
    : normalizeStatut(statut);
  if (!statutNorm) return res.status(400).json({ message: 'Statut de session invalide' });
  try {
    const existing = await prisma.sessionMentorat.findUnique({
      where: { id: Number(req.params.id) },
      include: { user: { select: { nom: true, email: true } }, mentor: { select: { nom: true } } },
    });
    if (!existing) return res.status(404).json({ message: 'Session introuvable' });
    await prisma.sessionMentorat.update({
      where: { id: Number(req.params.id) },
      data: { statut: statutNorm, notes: notes || null, lienReunion: lien_reunion || null, sujet: sujet || null },
    });
    if (['confirmee', 'refusee'].includes(statutNorm) && existing.statut !== statutNorm) {
      try {
        await notifierApprenanteDecisionMentorat({
          email: existing.user.email, nom: existing.user.nom, statut: statutNorm,
          mentor: existing.mentor.nom, dateSession: existing.dateSession, lienReunion: lien_reunion || existing.lienReunion,
        });
      } catch (emailError) { console.error('[Mentorat] Notification apprenante non envoyée:', emailError.message); }
    }
    res.json({ message: 'Session mise à jour' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Session introuvable' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteAdminSession = async (req, res) => {
  try {
    await prisma.sessionMentorat.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Session supprimée' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Session introuvable' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
