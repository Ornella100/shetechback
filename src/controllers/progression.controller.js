import prisma from '../lib/prisma.js';
import { attribuerBadges } from '../lib/badges.js';
import { recalculerProgressionFormation } from '../lib/progression-formation.js';

// IDs des leçons complétées par l'utilisatrice pour une formation donnée
export const getFormationProgressionLecons = async (req, res) => {
  const formationId = Number(req.params.id);
  try {
    const faites = await prisma.progressionLecon.findMany({
      where: {
        userId: req.user.id,
        completee: true,
        lecon: { cours: { module: { formationId } } },
      },
      select: { leconId: true },
    });
    res.json(faites.map((f) => f.leconId));
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const terminerLecon = async (req, res) => {
  const leconId = Number(req.params.id);
  try {
    const lecon = await prisma.lecon.findUnique({
      where: { id: leconId },
      select: { cours: { select: { module: { select: { formationId: true } } } } },
    });
    if (!lecon) return res.status(404).json({ message: 'Leçon introuvable' });
    await prisma.progressionLecon.upsert({
      where: { userId_leconId: { userId: req.user.id, leconId } },
      update: { completee: true, dateCompletee: new Date() },
      create: { userId: req.user.id, leconId, completee: true, dateCompletee: new Date() },
    });
    await recalculerProgressionFormation(req.user.id, lecon.cours.module.formationId);
    await attribuerBadges(req.user.id);
    res.json({ message: 'Leçon marquée comme terminée' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getModuleProgression = async (req, res) => {
  const moduleId = Number(req.params.id);
  const userId = req.user.id;
  try {
    const lecons = await prisma.lecon.findMany({
      where: { cours: { moduleId } },
      select: {
        id: true, titre: true, type: true,
        progressions: { where: { userId, completee: true }, select: { id: true } },
      },
    });
    res.json(lecons.map(l => ({ id: l.id, titre: l.titre, type: l.type, fait: l.progressions.length > 0 ? 1 : 0 })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getProgression = async (req, res) => {
  try {
    const [existantes, leconsFaites] = await Promise.all([
      prisma.progressionFormation.findMany({ where: { userId: req.user.id }, select: { formationId: true } }),
      prisma.progressionLecon.findMany({
        where: { userId: req.user.id, completee: true },
        select: { lecon: { select: { cours: { select: { module: { select: { formationId: true } } } } } } },
      }),
    ]);
    const formationIds = new Set([
      ...existantes.map((p) => p.formationId),
      ...leconsFaites.map((p) => p.lecon.cours.module.formationId),
    ]);
    await Promise.all([...formationIds].map((formationId) =>
      recalculerProgressionFormation(req.user.id, formationId)
    ));

    const progressions = await prisma.progressionFormation.findMany({
      where: { userId: req.user.id },
      include: { formation: { select: { titre: true, domaine: true } } },
    });
    res.json(progressions.map(p => ({
      ...p,
      user_id: p.userId, formation_id: p.formationId,
      formation_titre: p.formation.titre,
      formation_domaine: p.formation.domaine,
      domaine_id: p.formation.domaine === 'intelligence_artificielle' ? 'ia' : p.formation.domaine,
      updated_at: p.updatedAt,
    })));
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', detail: err.message });
  }
};

export const updateProgression = async (req, res) => {
  const { formation_id, pourcentage } = req.body;
  if (!formation_id || pourcentage === undefined)
    return res.status(400).json({ message: 'formation_id et pourcentage sont obligatoires' });
  try {
    const formation = await prisma.formation.findUnique({ where: { id: Number(formation_id) }, select: { id: true } });
    if (!formation) return res.status(404).json({ message: 'Formation introuvable' });

    await prisma.progressionFormation.upsert({
      where: { userId_formationId: { userId: req.user.id, formationId: Number(formation_id) } },
      update: { pourcentage },
      create: { userId: req.user.id, formationId: Number(formation_id), pourcentage },
    });
    res.json({ message: 'Progression mise à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', detail: err.message });
  }
};

export const getProgressionCalculee = async (req, res) => {
  const formationId = Number(req.params.id);
  const userId = req.user.id;
  try {
    const progression = await recalculerProgressionFormation(userId, formationId);
    res.json({
      pourcentage: progression.pourcentage,
      total: progression.total,
      faites: progression.faites,
      total_lecons: progression.totalLecons,
      lecons_faites: progression.leconsFaites,
      total_quiz: progression.totalQuiz,
      quiz_reussis: progression.quizReussis,
    });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
