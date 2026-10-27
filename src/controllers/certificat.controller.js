import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import prisma from '../lib/prisma.js';
import { generateClassicCertificatePDF, generateParcoursCertificatePDF } from '../lib/pdf.js';
import { attribuerBadges } from '../lib/badges.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function buildCertData(nomComplet, { titre, domaine, createdAt }) {
  const now = new Date();
  const numeroCertificat = 'SHT-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + now.getFullYear();
  return {
    nomComplet,
    domaine: domaine || titre,
    formationTitre: titre,
    dateDebut: new Date(createdAt || now),
    dateFin: now,
    numeroCertificat,
  };
}

function validerNomComplet(nomComplet) {
  const nom = String(nomComplet || '').trim().replace(/\s+/g, ' ');
  if (nom.length < 2) return { erreur: 'Le nom à imprimer est obligatoire (2 caractères minimum).' };
  if (nom.length > 100) return { erreur: 'Le nom à imprimer ne peut pas dépasser 100 caractères.' };
  return { nom };
}

// Progression détaillée d'une formation pour l'utilisateur (leçons + quiz de cours + quiz final)
async function progressionFormation(userId, formationId) {
  const [totalLecons, leconsFaites, quizCours, quizCoursReussis, nbQuizFinal, resultatFinal] = await Promise.all([
    prisma.lecon.count({ where: { cours: { module: { formationId } } } }),
    prisma.progressionLecon.count({
      where: { userId, completee: true, lecon: { cours: { module: { formationId } } } },
    }),
    prisma.coursQuiz.count({ where: { cours: { module: { formationId } } } }),
    prisma.coursQuizResultat.count({
      where: { userId, passed: true, quiz: { cours: { module: { formationId } } } },
    }),
    prisma.formationQuiz.count({ where: { formationId } }),
    prisma.formationQuizResultat.findUnique({
      where: { userId_formationId: { userId, formationId } },
      select: { passed: true, score: true },
    }),
  ]);
  return { totalLecons, leconsFaites, quizCours, quizCoursReussis, nbQuizFinal, resultatFinal };
}

// GET /formations/:id/certificat/verifier — le certificat est débloqué par le quiz final (>= 85 %)
export const verifierEligibilite = async (req, res) => {
  const formationId = Number(req.params.id);
  const userId = req.user.id;
  try {
    const formation = await prisma.formation.findUnique({ where: { id: formationId }, select: { titre: true } });
    if (!formation) return res.status(404).json({ message: 'Formation introuvable' });

    const p = await progressionFormation(userId, formationId);
    const quizFinalExiste = p.nbQuizFinal > 0;
    const quizFinalReussi = p.resultatFinal?.passed === true;
    const eligible = quizFinalExiste && quizFinalReussi;

    const total = p.totalLecons + p.quizCours + (quizFinalExiste ? 1 : 0);
    const fait = p.leconsFaites + p.quizCoursReussis + (quizFinalReussi ? 1 : 0);
    const pourcentage = total === 0 ? 0 : Math.round((fait / total) * 100);

    const existant = await prisma.certificat.findFirst({ where: { userId, formationId } });

    res.json({
      eligible,
      pourcentage,
      deja_genere: !!existant,
      certificat_id: existant?.id ?? null,
      nom_imprime: existant?.nomImprime ?? null,
      total,
      fait,
      quiz_final_existe: quizFinalExiste,
      quiz_final_reussi: quizFinalReussi,
      quiz_final_score: p.resultatFinal?.score ?? null,
      formation_titre: formation.titre,
      message: !quizFinalExiste
        ? 'Le quiz final de cette formation n\'est pas encore disponible.'
        : !quizFinalReussi
          ? 'Réussissez le quiz final à 85 % ou plus pour débloquer votre certificat.'
          : null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', detail: err.message });
  }
};

// POST /formations/:id/certificat/generer { nomComplet } — génération UNIQUE
export const genererCertificatFormation = async (req, res) => {
  const formationId = Number(req.params.id);
  const userId = req.user.id;
  try {
    const existant = await prisma.certificat.findFirst({ where: { userId, formationId } });
    if (existant) {
      return res.status(409).json({
        code: 'DEJA_GENERE',
        message: 'Votre certificat a déjà été généré. Le nom imprimé ne peut plus être modifié.',
        certificat_id: existant.id,
        nom_imprime: existant.nomImprime,
      });
    }

    const { nom, erreur } = validerNomComplet(req.body?.nomComplet);
    if (erreur) return res.status(400).json({ message: erreur });

    const p = await progressionFormation(userId, formationId);
    if (!(p.nbQuizFinal > 0 && p.resultatFinal?.passed === true))
      return res.status(403).json({ message: 'Vous devez réussir le quiz final (85 % minimum) avant de générer votre certificat.' });

    const formation = await prisma.formation.findUnique({
      where: { id: formationId },
      select: { titre: true, domaine: true, createdAt: true },
    });
    if (!formation) return res.status(404).json({ message: 'Formation introuvable' });

    const data = buildCertData(nom, formation);
    const filePath = await generateClassicCertificatePDF(data);
    const fileName = path.basename(filePath);

    const certificat = await prisma.certificat.create({
      data: {
        userId, formationId, type: 'formation',
        nomImprime: nom, nomFichier: fileName, codeVerification: data.numeroCertificat,
      },
    });
    await attribuerBadges(userId);

    res.status(201).json({
      message: 'Certificat généré',
      certificat_id: certificat.id,
      nom_imprime: nom,
      code_verification: data.numeroCertificat,
    });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ code: 'DEJA_GENERE', message: 'Votre certificat a déjà été généré.' });
    res.status(500).json({ message: 'Erreur lors de la génération', detail: err.message });
  }
};

// GET /parcours/:id/certificat/verifier — le Grand Certificat exige le quiz de parcours à 100 %
export const verifierEligibiliteParcours = async (req, res) => {
  const parcoursId = Number(req.params.id);
  const userId = req.user.id;
  try {
    const parcours = await prisma.parcours.findUnique({ where: { id: parcoursId }, select: { titre: true } });
    if (!parcours) return res.status(404).json({ message: 'Parcours introuvable' });

    const [nbQuiz, resultat, existant] = await Promise.all([
      prisma.parcoursQuiz.count({ where: { parcoursId } }),
      prisma.parcoursQuizResultat.findUnique({
        where: { userId_parcoursId: { userId, parcoursId } },
        select: { passed: true, score: true },
      }),
      prisma.certificat.findFirst({ where: { userId, parcoursId } }),
    ]);

    const quizExiste = nbQuiz > 0;
    const quizReussi = resultat?.passed === true;

    res.json({
      eligible: quizExiste && quizReussi,
      deja_genere: !!existant,
      certificat_id: existant?.id ?? null,
      nom_imprime: existant?.nomImprime ?? null,
      quiz_final_existe: quizExiste,
      quiz_final_reussi: quizReussi,
      quiz_final_score: resultat?.score ?? null,
      parcours_titre: parcours.titre,
      message: !quizExiste
        ? 'Le quiz final de ce parcours n\'est pas encore disponible.'
        : !quizReussi
          ? 'Le Grand Certificat exige un score de 100 % au quiz final du parcours.'
          : null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', detail: err.message });
  }
};

// POST /parcours/:id/certificat/generer { nomComplet } — génération UNIQUE
export const genererCertificatParcours = async (req, res) => {
  const parcoursId = Number(req.params.id);
  const userId = req.user.id;
  try {
    const existant = await prisma.certificat.findFirst({ where: { userId, parcoursId } });
    if (existant) {
      return res.status(409).json({
        code: 'DEJA_GENERE',
        message: 'Votre Grand Certificat a déjà été généré. Le nom imprimé ne peut plus être modifié.',
        certificat_id: existant.id,
        nom_imprime: existant.nomImprime,
      });
    }

    const { nom, erreur } = validerNomComplet(req.body?.nomComplet);
    if (erreur) return res.status(400).json({ message: erreur });

    const [nbQuiz, resultat, parcours] = await Promise.all([
      prisma.parcoursQuiz.count({ where: { parcoursId } }),
      prisma.parcoursQuizResultat.findUnique({
        where: { userId_parcoursId: { userId, parcoursId } },
        select: { passed: true },
      }),
      prisma.parcours.findUnique({ where: { id: parcoursId }, select: { titre: true, createdAt: true } }),
    ]);
    if (!parcours) return res.status(404).json({ message: 'Parcours introuvable' });
    if (!(nbQuiz > 0 && resultat?.passed === true))
      return res.status(403).json({ message: 'Vous devez réussir le quiz final du parcours à 100 % avant de générer le Grand Certificat.' });

    const data = buildCertData(nom, { titre: parcours.titre, domaine: parcours.titre, createdAt: parcours.createdAt });
    const filePath = await generateParcoursCertificatePDF(data);
    const fileName = path.basename(filePath);

    const certificat = await prisma.certificat.create({
      data: {
        userId, parcoursId, type: 'parcours',
        nomImprime: nom, nomFichier: fileName, codeVerification: data.numeroCertificat,
      },
    });
    await attribuerBadges(userId);

    res.status(201).json({
      message: 'Grand Certificat généré',
      certificat_id: certificat.id,
      nom_imprime: nom,
      code_verification: data.numeroCertificat,
    });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ code: 'DEJA_GENERE', message: 'Votre Grand Certificat a déjà été généré.' });
    res.status(500).json({ message: 'Erreur lors de la génération', detail: err.message });
  }
};

// GET /certificats — les deux types
export const mesCertificats = async (req, res) => {
  try {
    const certificats = await prisma.certificat.findMany({
      where: { userId: req.user.id },
      include: {
        formation: { select: { titre: true } },
        parcours: { select: { titre: true } },
      },
      orderBy: { dateObtention: 'desc' },
    });
    res.json(certificats.map(c => ({
      id: c.id,
      type: c.type,
      formation_id: c.formationId,
      parcours_id: c.parcoursId,
      titre: c.type === 'parcours' ? c.parcours?.titre : c.formation?.titre,
      nom_imprime: c.nomImprime,
      nom_fichier: c.nomFichier,
      code_verification: c.codeVerification,
      date_obtention: c.dateObtention,
    })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /certificats/:id/download — re-téléchargement (toujours autorisé)
export const downloadCertificat = async (req, res) => {
  try {
    const certificat = await prisma.certificat.findFirst({
      where: { id: Number(req.params.id), userId: req.user.id },
    });
    if (!certificat) return res.status(404).json({ message: 'Certificat introuvable' });
    const filePath = path.join(__dirname, '../../uploads/certificats', certificat.nomFichier);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Fichier introuvable sur le serveur' });
    res.download(filePath, certificat.nomFichier);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE /certificats/:id — ADMIN uniquement (la suppression par l'utilisatrice
// permettrait de contourner la génération unique du nom)
export const supprimerCertificat = async (req, res) => {
  try {
    const certificat = await prisma.certificat.findUnique({ where: { id: Number(req.params.id) } });
    if (!certificat) return res.status(404).json({ message: 'Certificat introuvable' });
    const filePath = path.join(__dirname, '../../uploads/certificats', certificat.nomFichier);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.certificat.delete({ where: { id: certificat.id } });
    res.json({ message: 'Certificat supprimé' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Certificat introuvable' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
