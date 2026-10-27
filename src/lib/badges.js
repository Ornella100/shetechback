import prisma from './prisma.js';

const BADGES = [
  { badgeName: 'Premier pas', description: 'Tu as terminé ta première leçon.' },
  { badgeName: 'Curiosité', description: 'Tu as terminé 5 leçons.' },
  { badgeName: 'Persévérance', description: 'Tu as terminé 10 leçons.' },
  { badgeName: 'Quiz réussi', description: 'Tu as réussi un quiz final de formation.' },
  { badgeName: 'Parcours maîtrisé', description: 'Tu as réussi un quiz final de parcours.' },
  { badgeName: 'Certifiée', description: 'Tu as obtenu ton premier certificat SheTech.' },
];

export async function attribuerBadges(userId) {
  try {
    const [leconsTerminees, quizFormationReussis, quizParcoursReussis, certificats] = await Promise.all([
      prisma.progressionLecon.count({ where: { userId, completee: true } }),
      prisma.formationQuizResultat.count({ where: { userId, passed: true } }),
      prisma.parcoursQuizResultat.count({ where: { userId, passed: true } }),
      prisma.certificat.count({ where: { userId } }),
    ]);

    const obtenus = [];
    if (leconsTerminees >= 1) obtenus.push(BADGES[0]);
    if (leconsTerminees >= 5) obtenus.push(BADGES[1]);
    if (leconsTerminees >= 10) obtenus.push(BADGES[2]);
    if (quizFormationReussis > 0) obtenus.push(BADGES[3]);
    if (quizParcoursReussis > 0) obtenus.push(BADGES[4]);
    if (certificats > 0) obtenus.push(BADGES[5]);

    for (const badge of obtenus) {
      await prisma.userAchievement.upsert({
        where: { userId_badgeName: { userId, badgeName: badge.badgeName } },
        update: { description: badge.description },
        create: { userId, ...badge },
      });
    }
    return obtenus;
  } catch (err) {
    // L’échec d’un badge ne doit pas annuler une progression ou un quiz déjà enregistré.
    console.error('Attribution des badges impossible:', err);
    return [];
  }
}
