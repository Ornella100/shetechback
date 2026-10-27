import prisma from '../lib/prisma.js';

export const getCours = async (req, res) => {
  const moduleId = Number(req.params.moduleId);
  try {
    const cours = await prisma.cours.findMany({
      where: { moduleId, isActive: true },
      orderBy: { ordre: 'asc' },
      include: {
        lecons: {
          orderBy: { ordre: 'asc' },
          include: {
            videos: true,
            audios: true,
            pieceJointes: true,
          },
        },
        quiz: {
          include: { questions: { orderBy: { ordre: 'asc' } } },
        },
      },
    });
    res.json(cours);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const getCoursDetail = async (req, res) => {
  const coursId = Number(req.params.id);
  try {
    const cours = await prisma.cours.findUnique({
      where: { id: coursId },
      include: {
        module: true,
        lecons: {
          orderBy: { ordre: 'asc' },
          include: {
            videos: true,
            audios: true,
            pieceJointes: true,
            progressions: req.user
              ? {
                  where: { userId: req.user.id },
                  select: { completee: true, tempsPasseMinutes: true, dateCompletee: true },
                }
              : false,
          },
        },
        quiz: {
          include: {
            questions: { orderBy: { ordre: 'asc' } },
            resultats: req.user
              ? {
                  where: { userId: req.user.id },
                  select: { score: true, passed: true, attempts: true },
                }
              : false,
          },
        },
      },
    });
    if (!cours) return res.status(404).json({ message: 'Cours introuvable' });
    res.json(cours);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const createCours = async (req, res) => {
  const { moduleId, titre, description, ordre } = req.body;
  if (!moduleId || !titre) return res.status(400).json({ message: 'Module et titre obligatoires' });
  try {
    const cours = await prisma.cours.create({
      data: {
        moduleId: Number(moduleId),
        titre,
        description: description || null,
        ordre: ordre || 1,
      },
    });
    res.status(201).json(cours);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const updateCours = async (req, res) => {
  const { titre, description, ordre, isActive } = req.body;
  const data = {};
  if (titre !== undefined) data.titre = titre;
  if (description !== undefined) data.description = description;
  if (ordre !== undefined) data.ordre = Number(ordre);
  if (isActive !== undefined) data.isActive = isActive;
  try {
    const cours = await prisma.cours.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(cours);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Cours introuvable' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const deleteCours = async (req, res) => {
  try {
    await prisma.cours.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Cours supprimé' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Cours introuvable' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
