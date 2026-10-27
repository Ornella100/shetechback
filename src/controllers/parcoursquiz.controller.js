import prisma from '../lib/prisma.js';
import { attribuerBadges } from '../lib/badges.js';
import { genererQuestionsQuiz } from '../lib/gemini.js';
import { normaliserQuestion, versFormatAdmin } from './formationquiz.controller.js';

// Le Grand Certificat de parcours exige un sans-faute
const SEUIL_REUSSITE_PARCOURS = 100;

// POST /parcours/:id/quiz-final/generate (admin) — génère via IA sur tout le parcours
export const generateQuizParcours = async (req, res) => {
  const parcoursId = Number(req.params.id);
  const { nb_questions = 10 } = req.body;
  try {
    const parcours = await prisma.parcours.findUnique({
      where: { id: parcoursId },
      include: {
        formations: {
          orderBy: { ordre: 'asc' },
          include: {
            modules: {
              orderBy: { id: 'asc' },
              include: {
                cours: {
                  orderBy: { id: 'asc' },
                  include: { lecons: { orderBy: { id: 'asc' }, select: { titre: true, contenuTexte: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!parcours) return res.status(404).json({ message: 'Parcours introuvable' });

    const contenu = parcours.formations
      .map(f => {
        const lecons = f.modules
          .flatMap(m => m.cours)
          .flatMap(c => c.lecons)
          .map(l => `${l.titre}\n${l.contenuTexte || ''}`)
          .join('\n');
        return `Formation : ${f.titre}\n${lecons}`;
      })
      .join('\n\n')
      .trim();

    if (!contenu) return res.status(400).json({ message: 'Aucun contenu texte dans les formations de ce parcours.' });

    const questions = await genererQuestionsQuiz({
      titre: `Parcours ${parcours.titre}`,
      contenu,
      nbQuestions: nb_questions,
    });
    res.json({ questions, parcours_titre: parcours.titre });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la génération du quiz', detail: err.message });
  }
};

// POST /parcours/:id/quiz-final (admin) — sauvegarde les questions
export const saveQuizParcours = async (req, res) => {
  const parcoursId = Number(req.params.id);
  const { questions } = req.body;
  if (!questions || !Array.isArray(questions) || questions.length === 0)
    return res.status(400).json({ message: 'Questions obligatoires' });

  const normalisees = questions.map(normaliserQuestion);
  const invalide = normalisees.findIndex(q => q === null);
  if (invalide !== -1)
    return res.status(400).json({ message: `Question ${invalide + 1} invalide : au moins 2 options et une réponse correcte requises` });

  try {
    await prisma.$transaction([
      prisma.parcoursQuiz.deleteMany({ where: { parcoursId } }),
      prisma.parcoursQuiz.createMany({
        data: normalisees.map((q, i) => ({ parcoursId, ...q, ordre: i + 1 })),
      }),
    ]);
    res.status(201).json({ message: 'Quiz final du parcours sauvegardé', nb_questions: questions.length });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', detail: err.message });
  }
};

// GET /parcours/:id/quiz-final/admin (admin) — questions avec réponses
export const getQuizParcoursAdmin = async (req, res) => {
  try {
    const quiz = await prisma.parcoursQuiz.findMany({
      where: { parcoursId: Number(req.params.id) },
      orderBy: { ordre: 'asc' },
    });
    res.json(quiz.map(versFormatAdmin));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Prérequis du quiz de parcours : inscrite + tous les quiz finaux de formation réussis
async function verifierPrerequisParcours(userId, parcoursId) {
  const [inscription, formations] = await Promise.all([
    prisma.userParcours.findUnique({
      where: { userId_parcoursId: { userId, parcoursId } },
    }),
    prisma.formation.findMany({
      where: { parcoursId, formationQuiz: { some: {} } },
      select: {
        id: true, titre: true,
        formationQuizResultats: { where: { userId, passed: true }, select: { userId: true } },
      },
    }),
  ]);
  const inscrite = inscription?.statut === 'actif' || inscription?.statut === 'termine';
  const formationsManquantes = formations
    .filter(f => f.formationQuizResultats.length === 0)
    .map(f => ({ id: f.id, titre: f.titre }));
  return { inscrite, formationsManquantes };
}

// GET /parcours/:id/quiz-final/status (token)
export const getQuizParcoursStatus = async (req, res) => {
  const parcoursId = Number(req.params.id);
  const userId = req.user.id;
  try {
    const [nbQuestions, result, prerequis] = await Promise.all([
      prisma.parcoursQuiz.count({ where: { parcoursId } }),
      prisma.parcoursQuizResultat.findUnique({
        where: { userId_parcoursId: { userId, parcoursId } },
        select: { score: true, passed: true, attempts: true },
      }),
      verifierPrerequisParcours(userId, parcoursId),
    ]);
    res.json({
      existe: nbQuestions > 0,
      nb_questions: nbQuestions,
      seuil: SEUIL_REUSSITE_PARCOURS,
      reussi: result?.passed === true,
      score: result?.score ?? null,
      tentatives: result?.attempts ?? 0,
      inscrite: prerequis.inscrite,
      formations_manquantes: prerequis.formationsManquantes,
    });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /parcours/:id/quiz-final (token) — questions sans les réponses
export const getQuizParcours = async (req, res) => {
  try {
    const quiz = await prisma.parcoursQuiz.findMany({
      where: { parcoursId: Number(req.params.id) },
      orderBy: { ordre: 'asc' },
      select: { id: true, parcoursId: true, question: true, options: true, ordre: true },
    });
    res.json({ seuil: SEUIL_REUSSITE_PARCOURS, questions: quiz });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /parcours/:id/quiz-final/soumettre (token) — 100 % requis pour le Grand Certificat
export const soumettreQuizParcours = async (req, res) => {
  const parcoursId = Number(req.params.id);
  const userId = req.user.id;
  const { reponses } = req.body;
  try {
    const prerequis = await verifierPrerequisParcours(userId, parcoursId);
    if (!prerequis.inscrite)
      return res.status(403).json({ message: 'Vous devez être inscrite à ce parcours pour passer son quiz final.' });
    if (prerequis.formationsManquantes.length > 0)
      return res.status(403).json({
        message: 'Réussissez d\'abord le quiz final de chaque formation du parcours.',
        formations_manquantes: prerequis.formationsManquantes,
      });

    const questions = await prisma.parcoursQuiz.findMany({
      where: { parcoursId },
      orderBy: { ordre: 'asc' },
    });
    if (questions.length === 0)
      return res.status(404).json({ message: 'Aucun quiz final pour ce parcours' });

    let correct = 0;
    const details = questions.map(q => {
      const repUser = Number(reponses?.[q.id]);
      const ok = repUser === q.reponse;
      if (ok) correct++;
      return {
        id: q.id, question: q.question, reponse_user: Number.isNaN(repUser) ? null : repUser,
        reponse_correcte: q.reponse, correct: ok, explication: q.explication,
      };
    });

    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= SEUIL_REUSSITE_PARCOURS;

    const existant = await prisma.parcoursQuizResultat.findUnique({
      where: { userId_parcoursId: { userId, parcoursId } },
    });
    await prisma.parcoursQuizResultat.upsert({
      where: { userId_parcoursId: { userId, parcoursId } },
      update: {
        score: existant?.passed ? Math.max(score, existant.score) : score,
        passed: passed || existant?.passed === true,
        attempts: { increment: 1 },
      },
      create: { userId, parcoursId, score, passed },
    });
    await attribuerBadges(userId);

    res.json({
      score, reussi: passed, correct, total: questions.length, seuil: SEUIL_REUSSITE_PARCOURS, details,
      message: passed
        ? 'Félicitations ! Sans-faute : votre Grand Certificat de parcours est débloqué.'
        : `Score de ${score}/100. Le Grand Certificat exige 100 % de bonnes réponses. Réessayez !`,
    });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
