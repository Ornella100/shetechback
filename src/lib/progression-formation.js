import prisma from './prisma.js';

export async function recalculerProgressionFormation(userId, formationId) {
  const [totalLecons, leconsFaites, totalQuiz, quizReussis] = await Promise.all([
    prisma.lecon.count({ where: { cours: { module: { formationId } } } }),
    prisma.progressionLecon.count({
      where: { userId, completee: true, lecon: { cours: { module: { formationId } } } },
    }),
    prisma.coursQuiz.count({ where: { cours: { module: { formationId } } } }),
    prisma.coursQuizResultat.count({
      where: { userId, passed: true, quiz: { cours: { module: { formationId } } } },
    }),
  ]);

  const total = totalLecons + totalQuiz;
  const faites = leconsFaites + quizReussis;
  const pourcentage = total === 0 ? 0 : Math.round((faites / total) * 100);
  await prisma.progressionFormation.upsert({
    where: { userId_formationId: { userId, formationId } },
    update: { pourcentage },
    create: { userId, formationId, pourcentage },
  });

  return { pourcentage, total, faites, totalLecons, leconsFaites, totalQuiz, quizReussis };
}
