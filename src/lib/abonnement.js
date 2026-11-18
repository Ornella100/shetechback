import prisma from './prisma.js';

// Source de vérité unique : accès du personnel, compte de test ou achat unique.
export async function getStatutAcces(userId) {
  const now = new Date();
  const [user, achat] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } }),
    prisma.abonnement.findFirst({
      where: { userId, statut: 'active', OR: [{ dateFin: null }, { dateFin: { gt: now } }] },
      orderBy: { dateFin: 'desc' },
    }),
  ]);

  if (!user) return { acces: false, type: 'requis', achatEffectue: false, trialEndsAt: null, abonnementFin: null };

  if (user.role === 'admin' || user.role === 'mentor')
    return { acces: true, type: 'staff', achatEffectue: true, trialEndsAt: null, abonnementFin: null };

  if (process.env.TEST_ACCESS_EMAIL?.trim().toLowerCase() === user.email.toLowerCase())
    return { acces: true, type: 'test', achatEffectue: false, trialEndsAt: null, abonnementFin: null };

  if (achat)
    return { acces: true, type: achat.dateFin ? 'achat_legacy' : 'achat', achatEffectue: true, trialEndsAt: null, abonnementFin: achat.dateFin };

  return { acces: false, type: 'requis', achatEffectue: false, trialEndsAt: null, abonnementFin: null };
}
