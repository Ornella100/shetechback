import prisma from '../lib/prisma.js';
import { getIO } from '../lib/socket.js';

// La messagerie directe entre deux membres n'est ouverte qu'en cas de suivi mutuel
// (chacun suit l'autre) — cf. règle communauté SheTech.
async function estMutuel(userIdA, userIdB) {
  const [a, b] = await Promise.all([
    prisma.userFollow.findUnique({ where: { followerId_followingId: { followerId: userIdA, followingId: userIdB } } }),
    prisma.userFollow.findUnique({ where: { followerId_followingId: { followerId: userIdB, followingId: userIdA } } }),
  ]);
  return !!a && !!b;
}

async function estEchangeMentorat(userIdA, userIdB) {
  const users = await prisma.user.findMany({
    where: { id: { in: [userIdA, userIdB] } },
    select: { id: true, role: true },
  });
  const roles = new Map(users.map((user) => [user.id, user.role]));
  const mentorId = roles.get(userIdA) === 'mentor' ? userIdA : roles.get(userIdB) === 'mentor' ? userIdB : null;
  const adminPresent = roles.get(userIdA) === 'admin' || roles.get(userIdB) === 'admin';
  if (!mentorId || !adminPresent) return false;
  return Boolean(await prisma.demandeMentorat.findFirst({ where: { mentorId }, select: { id: true } }));
}

export const getConversations = async (req, res) => {
  const userId = req.user.id;
  try {
    const [suivis, suiveurs] = await Promise.all([
      prisma.userFollow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
      prisma.userFollow.findMany({ where: { followingId: userId }, select: { followerId: true } }),
    ]);
    const suivisSet = new Set(suivis.map((s) => s.followingId));
    const mutuels = suiveurs.map((s) => s.followerId).filter((id) => suivisSet.has(id));
    const contacts = new Set(mutuels);
    const role = req.user.role;
    if (role === 'admin') {
      const suivis = await prisma.demandeMentorat.findMany({ where: { mentorId: { not: null } }, select: { mentorId: true }, distinct: ['mentorId'] });
      suivis.forEach((suivi) => contacts.add(suivi.mentorId));
    } else if (role === 'mentor') {
      const aUnSuivi = await prisma.demandeMentorat.findFirst({ where: { mentorId: userId }, select: { id: true } });
      if (aUnSuivi) {
        const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
        admins.forEach((admin) => contacts.add(admin.id));
      }
    }
    const users = await prisma.user.findMany({ where: { id: { in: [...contacts] } }, select: { id: true, nom: true, role: true } });
    const conversations = await Promise.all(users.map(async (u) => {
      const [dernierMessage, nbNonLus] = await Promise.all([
        prisma.message.findFirst({
          where: { OR: [{ expediteurId: userId, destinataireId: u.id }, { expediteurId: u.id, destinataireId: userId }] },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.message.count({ where: { expediteurId: u.id, destinataireId: userId, lu: false } }),
      ]);
      return {
        user_id: u.id, nom: u.nom, role: u.role,
        dernier_message: dernierMessage?.contenu || null,
        dernier_message_at: dernierMessage?.createdAt || null,
        nb_non_lus: nbNonLus,
      };
    }));
    conversations.sort((a, b) => new Date(b.dernier_message_at || 0) - new Date(a.dernier_message_at || 0));
    res.json(conversations);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getMessagesAvec = async (req, res) => {
  const userId = req.user.id;
  const autreId = Number(req.params.userId);
  try {
    const [mutuel, echangeMentorat] = await Promise.all([estMutuel(userId, autreId), estEchangeMentorat(userId, autreId)]);
    if (!mutuel && !echangeMentorat) return res.status(403).json({ message: 'La messagerie nécessite un suivi mutuel ou une attribution de mentorat.' });
    const messages = await prisma.message.findMany({
      where: { OR: [{ expediteurId: userId, destinataireId: autreId }, { expediteurId: autreId, destinataireId: userId }] },
      orderBy: { createdAt: 'asc' },
    });
    await prisma.message.updateMany({ where: { expediteurId: autreId, destinataireId: userId, lu: false }, data: { lu: true } });
    res.json(messages.map((m) => ({ id: m.id, contenu: m.contenu, created_at: m.createdAt, user_id: m.expediteurId, moi: m.expediteurId === userId })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const envoyerMessageDirect = async (req, res) => {
  const userId = req.user.id;
  const autreId = Number(req.params.userId);
  const { contenu } = req.body;
  if (!contenu || !contenu.trim()) return res.status(400).json({ message: 'Le contenu est obligatoire' });
  if (autreId === userId) return res.status(400).json({ message: "Impossible de s'écrire à soi-même" });
  try {
    const [mutuel, echangeMentorat] = await Promise.all([estMutuel(userId, autreId), estEchangeMentorat(userId, autreId)]);
    if (!mutuel && !echangeMentorat) return res.status(403).json({ message: 'La messagerie nécessite un suivi mutuel ou une attribution de mentorat.' });
    const m = await prisma.message.create({ data: { expediteurId: userId, destinataireId: autreId, contenu: contenu.trim() } });
    const message = { id: m.id, contenu: m.contenu, created_at: m.createdAt, user_id: m.expediteurId };
    getIO()?.to(`user:${autreId}`).emit('message:direct', { otherUserId: userId, message });
    res.status(201).json({ ...message, moi: true });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
