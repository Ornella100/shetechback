import prisma from './prisma.js';

// Source de vérité unique pour l'accès au contenu des formations.
// Accès si : essai gratuit en cours OU abonnement actif non expiré.
export async function getStatutAcces(userId) {
  const now = new Date();
  const [user, abonnement] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { trialEndsAt: true, role: true } }),
    prisma.abonnement.findFirst({
      where: { userId, statut: 'active', dateFin: { gt: now } },
      orderBy: { dateFin: 'desc' },
    }),
  ]);

  if (!user) return { acces: false, type: 'expire', trialEndsAt: null, abonnementFin: null };

  if (user.role === 'admin' || user.role === 'mentor')
    return { acces: true, type: 'staff', trialEndsAt: user.trialEndsAt, abonnementFin: null };

  if (abonnement)
    return { acces: true, type: 'abonnement', trialEndsAt: user.trialEndsAt, abonnementFin: abonnement.dateFin };

  if (user.trialEndsAt && user.trialEndsAt > now)
    return { acces: true, type: 'trial', trialEndsAt: user.trialEndsAt, abonnementFin: null };

  return { acces: false, type: 'expire', trialEndsAt: user.trialEndsAt, abonnementFin: null };
}
