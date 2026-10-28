import prisma from '../lib/prisma.js';
import { getFormationAccess } from '../lib/formation-access.js';
import { getStatutAcces } from '../lib/abonnement.js';

const findFormationId = async (kind, id) => {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  if (kind === 'formation') return numericId;
  if (kind === 'module') {
    const module = await prisma.module.findUnique({ where: { id: numericId }, select: { formationId: true } });
    return module?.formationId ?? null;
  }
  if (kind === 'cours') {
    const cours = await prisma.cours.findUnique({ where: { id: numericId }, select: { module: { select: { formationId: true } } } });
    return cours?.module?.formationId ?? null;
  }
  if (kind === 'lecon') {
    const lecon = await prisma.lecon.findUnique({
      where: { id: numericId },
      select: { cours: { select: { module: { select: { formationId: true } } } } },
    });
    return lecon?.cours?.module?.formationId ?? null;
  }
  return null;
};

export function verifierAccesFormation(kind, paramName, { source = 'params' } = {}) {
  return async (req, res, next) => {
    try {
      const rawId = Number(source === 'body' ? req.body?.[paramName] : req.params[paramName]);
      if (!Number.isInteger(rawId) || rawId <= 0) {
        return res.status(404).json({ message: 'Formation introuvable' });
      }
      const formationId = await findFormationId(kind, rawId);
      // Laisser le contrôleur renvoyer son 404 habituel pour un identifiant inconnu.
      if (!formationId) return next();

      const access = await getFormationAccess(req.user.id, formationId);
      if (!access.acces) {
        if (access.inscriptionRequise) {
          return res.status(403).json({
            code: 'INSCRIPTION_PARCOURS_REQUISE',
            message: 'Inscrivez-vous au parcours avant de commencer cette formation.',
          });
        }
        return res.status(402).json({
          code: 'ABONNEMENT_REQUIS',
          message: 'Votre période d’essai est terminée. Abonnez-vous pour accéder au contenu.',
        });
      }
      return next();
    } catch {
      return res.status(500).json({ message: 'Erreur serveur lors de la vérification des accès.' });
    }
  };
}

export function verifierAccesParcours(paramName) {
  return async (req, res, next) => {
    try {
      const parcoursId = Number(req.params[paramName]);
      if (!Number.isInteger(parcoursId) || parcoursId <= 0) {
        return res.status(404).json({ message: 'Parcours introuvable' });
      }

      const parcours = await prisma.parcours.findUnique({ where: { id: parcoursId }, select: { id: true } });
      if (!parcours) return next();

      const statut = await getStatutAcces(req.user.id);
      if (statut.type !== 'staff') {
        const inscription = await prisma.userParcours.findUnique({
          where: { userId_parcoursId: { userId: Number(req.user.id), parcoursId } },
          select: { statut: true },
        });
        if (!['actif', 'termine'].includes(inscription?.statut)) {
          return res.status(403).json({
            code: 'INSCRIPTION_PARCOURS_REQUISE',
            message: 'Inscrivez-vous au parcours pour accéder à son quiz.',
          });
        }
        if (!statut.acces) {
          return res.status(402).json({
            code: 'ABONNEMENT_REQUIS',
            message: 'Votre période d’essai est terminée. Abonnez-vous pour accéder au quiz.',
          });
        }
      }
      return next();
    } catch {
      return res.status(500).json({ message: 'Erreur serveur lors de la vérification des accès.' });
    }
  };
}
