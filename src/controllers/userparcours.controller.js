import prisma from '../lib/prisma.js';
import { getStatutAcces } from '../lib/abonnement.js';
import { notifierAdminNouvelleDemandeSuivi } from '../lib/mailer.js';

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
      selectionnes: inscriptions.length,
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

    const access = await getStatutAcces(userId);
    if (!access.acces) {
      return res.status(402).json({
        code: 'ACHAT_REQUIS',
        message: 'Achetez le pack à 150 000 FCFA pour choisir jusqu’à trois parcours avant de commencer.',
      });
    }

    const leconsDisponibles = await prisma.lecon.count({
      where: {
        isActive: true,
        cours: {
          isActive: true,
          module: { isActive: true, formation: { parcoursId } },
        },
      },
    });
    if (leconsDisponibles === 0) {
      return res.status(409).json({
        code: 'PARCOURS_EN_PREPARATION',
        message: 'Ce parcours sera ouvert dès qu’il contiendra au moins une leçon.',
      });
    }

    const resultat = await prisma.$transaction(async (tx) => {
      const existante = await tx.userParcours.findUnique({
        where: { userId_parcoursId: { userId, parcoursId } },
      });
      if (existante?.statut === 'actif' || existante?.statut === 'termine') return { deja: true };
      const demandeExistante = await tx.demandeMentorat.findUnique({
        where: { userId_parcoursId: { userId, parcoursId } },
        select: { id: true },
      });

      const selections = await tx.userParcours.count({ where: { userId } });
      if (!existante && selections >= MAX_PARCOURS) return { limite: true };

      if (existante) {
        await tx.userParcours.update({
          where: { id: existante.id },
          data: { statut: 'actif', dateInscription: new Date() },
        });
      } else {
        await tx.userParcours.create({ data: { userId, parcoursId } });
      }
      await tx.demandeMentorat.upsert({
        where: { userId_parcoursId: { userId, parcoursId } },
        create: { userId, parcoursId },
        update: { updatedAt: new Date() },
      });
      return { ok: true, nouvelleDemande: !demandeExistante };
    });

    if (resultat.deja) return res.status(200).json({ message: 'Vous suivez déjà ce parcours.' });
    if (resultat.limite)
      return res.status(400).json({
        code: 'LIMITE_PARCOURS',
        message: `Votre pack permet de choisir ${MAX_PARCOURS} parcours au total.`,
      });

    if (resultat.nouvelleDemande) {
      try {
        const [apprenante, parcoursInfo] = await Promise.all([
          prisma.user.findUnique({ where: { id: userId }, select: { nom: true, email: true } }),
          prisma.parcours.findUnique({ where: { id: parcoursId }, select: { titre: true } }),
        ]);
        if (apprenante && parcoursInfo) await notifierAdminNouvelleDemandeSuivi({ apprenante, parcours: parcoursInfo });
      } catch (emailError) {
        console.error('[Mentorat] Notification admin non envoyée:', emailError.message);
      }
    }

    res.status(201).json({ message: `Vous êtes inscrite au parcours « ${parcours.titre} ». Votre demande de suivi par une mentor a été transmise à l’équipe SheTech.` });
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
