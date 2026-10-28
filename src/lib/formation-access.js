import prisma from './prisma.js';
import { getStatutAcces } from './abonnement.js';

export async function getFormationAccess(userId, formationId) {
  const formation = await prisma.formation.findUnique({
    where: { id: Number(formationId) },
    select: { id: true, parcoursId: true },
  });
  if (!formation) return { exists: false, acces: false, inscriptionRequise: false };
  if (!userId) return { exists: true, acces: false, inscriptionRequise: Boolean(formation.parcoursId) };

  const statut = await getStatutAcces(Number(userId));
  const staff = statut.type === 'staff';
  let inscrit = !formation.parcoursId || staff;

  if (formation.parcoursId && !staff) {
    const inscription = await prisma.userParcours.findUnique({
      where: { userId_parcoursId: { userId: Number(userId), parcoursId: formation.parcoursId } },
      select: { statut: true },
    });
    inscrit = inscription?.statut === 'actif' || inscription?.statut === 'termine';
  }

  return {
    exists: true,
    acces: staff || (inscrit && statut.acces),
    inscriptionRequise: !inscrit,
    abonnementRequis: !staff && !statut.acces,
  };
}

export function masquerContenuFormation(formation, access = {}) {
  formation.modules?.forEach((module) => module.cours?.forEach((cours) => cours.lecons?.forEach((lecon) => {
    lecon.contenuTexte = null;
    lecon.videos = [];
    lecon.audios = [];
    lecon.pieceJointes = [];
    lecon.verrouille = true;
  })));
  formation.accesRestreint = Boolean(access.abonnementRequis);
  formation.inscriptionRequise = Boolean(access.inscriptionRequise);
  return formation;
}
