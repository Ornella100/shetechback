import prisma from '../lib/prisma.js';
import { genererQuestionsQuiz } from '../lib/gemini.js';
import { attribuerBadges } from '../lib/badges.js';

const SEUIL_REUSSITE = 85;

const LETTRE_VERS_INDEX = { a: 0, b: 1, c: 2, d: 3 };
const INDEX_VERS_LETTRE = ['a', 'b', 'c', 'd'];

// Format de compatibilité pour l'éditeur admin (option_a..d + reponse_correcte)
export function versFormatAdmin(q) {
  return {
    ...q,
    option_a: q.options[0] ?? null,
    option_b: q.options[1] ?? null,
    option_c: q.options[2] ?? null,
    option_d: q.options[3] ?? null,
    reponse_correcte: INDEX_VERS_LETTRE[q.reponse] ?? 'a',
  };
}

// Normalise une question entrante : accepte { options[], reponse } (nouveau format)
// ou { option_a..option_d, reponse_correcte } (ancien format de l'éditeur admin / Gemini)
export function normaliserQuestion(q) {
  if (Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.reponse)) {
    return { question: q.question, options: q.options, reponse: q.reponse, explication: q.explication || null };
  }
  const options = [q.option_a, q.option_b, q.option_c, q.option_d].filter(o => o != null && o !== '');
  const reponse = LETTRE_VERS_INDEX[String(q.reponse_correcte || '').toLowerCase()];
  if (options.length < 2 || reponse === undefined || reponse >= options.length) return null;
  return { question: q.question, options, reponse, explication: q.explication || null };
}

// POST /formations/:id/quiz-final/generate (admin) — génère via IA, sans sauvegarder
export const generateQuizFinal = async (req, res) => {
  const formationId = Number(req.params.id);
  const { nb_questions = 8 } = req.body;
  try {
    const formation = await prisma.formation.findUnique({
      where: { id: formationId },
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
    });
    if (!formation) return res.status(404).json({ message: 'Formation introuvable' });

    const contenu = formation.modules
      .map((m, i) => {
        const lecons = m.cours
          .flatMap(c => c.lecons)
          .map(l => `${l.titre}\n${l.contenuTexte || ''}`)
          .join('\n');
        return `Module ${i + 1} : ${m.titre}\n${lecons}`;
      })
      .join('\n\n')
      .trim();

    if (!contenu) return res.status(400).json({ message: 'Aucun contenu texte dans les modules de cette formation.' });

    const questions = await genererQuestionsQuiz({
      titre: formation.titre,
      contenu,
      nbQuestions: nb_questions,
    });
    res.json({ questions, formation_titre: formation.titre });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la génération du quiz', detail: err.message });
  }
};

// POST /formations/:id/quiz-final (admin) — sauvegarde les questions
export const saveQuizFinal = async (req, res) => {
  const formationId = Number(req.params.id);
  const { questions } = req.body;
  if (!questions || !Array.isArray(questions) || questions.length === 0)
    return res.status(400).json({ message: 'Questions obligatoires' });

  const normalisees = questions.map(normaliserQuestion);
  const invalide = normalisees.findIndex(q => q === null);
  if (invalide !== -1)
    return res.status(400).json({ message: `Question ${invalide + 1} invalide : au moins 2 options et une réponse correcte requises` });

  try {
    await prisma.$transaction([
      prisma.formationQuiz.deleteMany({ where: { formationId } }),
      prisma.formationQuiz.createMany({
        data: normalisees.map((q, i) => ({ formationId, ...q, ordre: i + 1 })),
      }),
    ]);
    res.status(201).json({ message: 'Quiz final sauvegardé', nb_questions: questions.length });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', detail: err.message });
  }
};

// GET /formations/:id/quiz-final/admin (admin) — questions avec réponses
export const getQuizFinalAdmin = async (req, res) => {
  try {
    const quiz = await prisma.formationQuiz.findMany({
      where: { formationId: Number(req.params.id) },
      orderBy: { ordre: 'asc' },
    });
    res.json(quiz.map(versFormatAdmin));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /formations/:id/quiz-final (token) — questions sans les réponses
export const getQuizFinal = async (req, res) => {
  try {
    const quiz = await prisma.formationQuiz.findMany({
      where: { formationId: Number(req.params.id) },
      orderBy: { ordre: 'asc' },
      select: { id: true, formationId: true, question: true, options: true, ordre: true },
    });
    res.json({ seuil: SEUIL_REUSSITE, questions: quiz });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /formations/:id/quiz-final/status (token) — l'utilisateur a-t-il réussi ?
export const getQuizFinalStatus = async (req, res) => {
  const formationId = Number(req.params.id);
  try {
    const [nbQuestions, result] = await Promise.all([
      prisma.formationQuiz.count({ where: { formationId } }),
      prisma.formationQuizResultat.findUnique({
        where: { userId_formationId: { userId: req.user.id, formationId } },
        select: { score: true, passed: true, attempts: true },
      }),
    ]);
    res.json({
      existe: nbQuestions > 0,
      nb_questions: nbQuestions,
      seuil: SEUIL_REUSSITE,
      reussi: result?.passed === true,
      score: result?.score ?? null,
      tentatives: result?.attempts ?? 0,
    });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /formations/:id/quiz-final/soumettre (token) — corrige et enregistre
export const soumettreQuizFinal = async (req, res) => {
  const formationId = Number(req.params.id);
  const { reponses } = req.body;
  try {
    const questions = await prisma.formationQuiz.findMany({
      where: { formationId },
      orderBy: { ordre: 'asc' },
    });
    if (questions.length === 0)
      return res.status(404).json({ message: 'Aucun quiz final pour cette formation' });

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
    const passed = score >= SEUIL_REUSSITE;

    const existant = await prisma.formationQuizResultat.findUnique({
      where: { userId_formationId: { userId: req.user.id, formationId } },
    });
    await prisma.formationQuizResultat.upsert({
      where: { userId_formationId: { userId: req.user.id, formationId } },
      // On conserve la meilleure réussite : un échec après une réussite ne la retire pas
      update: {
        score: existant?.passed ? Math.max(score, existant.score) : score,
        passed: passed || existant?.passed === true,
        attempts: { increment: 1 },
      },
      create: { userId: req.user.id, formationId, score, passed },
    });
    await attribuerBadges(req.user.id);

    res.json({
      score, reussi: passed, correct, total: questions.length, seuil: SEUIL_REUSSITE, details,
      message: passed
        ? 'Félicitations ! Vous avez réussi le quiz final. Votre certificat est débloqué.'
        : `Score insuffisant (${score}/100). Il faut au moins ${SEUIL_REUSSITE}% pour valider la formation. Réessayez !`,
    });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
