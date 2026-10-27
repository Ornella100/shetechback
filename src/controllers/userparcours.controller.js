import prisma from '../lib/prisma.js';

const MAX_PARCOURS = 3;

// GET /parcours/mes-inscriptions (token)
export const mesInscriptions = async (req, res) => {
  try {
    const inscriptions = await prisma.userParcours.findMany({
      where: { userId: req.user.id },
      include: { parcours: { select: { id: true, titre: true, description: true, imageUrl: true } } },
      orderBy: { dateInscription: 'asc' },
    });
    const actifs = inscriptions.filter(i => i.statut === 'actif').length;
    res.json({
      max: MAX_PARCOURS,
      actifs,
      inscriptions: inscriptions.map(i => ({
        id: i.id,
        parcours_id: i.parcoursId,
        statut: i.statut,
        date_inscription: i.dateInscription,
        parcours: i.parcours,
      })),
    });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /parcours/:id/inscription (token) — limite de 3 parcours actifs
export const inscrireParcours = async (req, res) => {
  const parcoursId = Number(req.params.id);
  const userId = req.user.id;
  try {
    const parcours = await prisma.parcours.findUnique({ where: { id: parcoursId }, select: { id: true, titre: true } });
    if (!parcours) return res.status(404).json({ message: 'Parcours introuvable' });

    const resultat = await prisma.$transaction(async (tx) => {
      const existante = await tx.userParcours.findUnique({
        where: { userId_parcoursId: { userId, parcoursId } },
      });
      if (existante?.statut === 'actif' || existante?.statut === 'termine') return { deja: true };

      const actifs = await tx.userParcours.count({ where: { userId, statut: 'actif' } });
      if (actifs >= MAX_PARCOURS) return { limite: true };

      if (existante) {
        await tx.userParcours.update({
          where: { id: existante.id },
          data: { statut: 'actif', dateInscription: new Date() },
        });
      } else {
        await tx.userParcours.create({ data: { userId, parcoursId } });
      }
      return { ok: true };
    });

    if (resultat.deja) return res.status(200).json({ message: 'Vous suivez déjà ce parcours.' });
    if (resultat.limite)
      return res.status(400).json({
        code: 'LIMITE_PARCOURS',
        message: `Vous suivez déjà ${MAX_PARCOURS} parcours (maximum autorisé). Désinscrivez-vous d'un parcours pour en suivre un autre.`,
      });

    res.status(201).json({ message: `Vous êtes inscrite au parcours « ${parcours.titre} ».` });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', detail: err.message });
  }
};

// DELETE /parcours/:id/inscription (token) — conserve l'historique (statut abandonne)
export const desinscrireParcours = async (req, res) => {
  const parcoursId = Number(req.params.id);
  try {
    const existante = await prisma.userParcours.findUnique({
      where: { userId_parcoursId: { userId: req.user.id, parcoursId } },
    });
    if (!existante || existante.statut !== 'actif')
      return res.status(404).json({ message: 'Vous ne suivez pas ce parcours.' });

    await prisma.userParcours.update({
      where: { id: existante.id },
      data: { statut: 'abandonne' },
    });
    res.json({ message: 'Vous ne suivez plus ce parcours.' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
