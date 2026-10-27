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

export const getConversations = async (req, res) => {
  const userId = req.user.id;
  try {
    const [suivis, suiveurs] = await Promise.all([
      prisma.userFollow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
      prisma.userFollow.findMany({ where: { followingId: userId }, select: { followerId: true } }),
    ]);
    const suivisSet = new Set(suivis.map((s) => s.followingId));
    const mutuels = suiveurs.map((s) => s.followerId).filter((id) => suivisSet.has(id));
    if (mutuels.length === 0) return res.json([]);

    const users = await prisma.user.findMany({ where: { id: { in: mutuels } }, select: { id: true, nom: true, role: true } });
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
    const mutuel = await estMutuel(userId, autreId);
    if (!mutuel) return res.status(403).json({ message: 'La messagerie nécessite un suivi mutuel' });
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
    const mutuel = await estMutuel(userId, autreId);
    if (!mutuel) return res.status(403).json({ message: 'La messagerie nécessite un suivi mutuel' });
    const m = await prisma.message.create({ data: { expediteurId: userId, destinataireId: autreId, contenu: contenu.trim() } });
    const message = { id: m.id, contenu: m.contenu, created_at: m.createdAt, user_id: m.expediteurId };
    getIO()?.to(`user:${autreId}`).emit('message:direct', { otherUserId: userId, message });
    res.status(201).json({ ...message, moi: true });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
