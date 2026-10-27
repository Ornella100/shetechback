import prisma from '../lib/prisma.js';

export const getModules = async (req, res) => {
  const formationId = Number(req.params.formationId);
  try {
    const modules = await prisma.module.findMany({
      where: { formationId, isActive: true },
      orderBy: { id: 'asc' },
      include: {
        cours: {
          orderBy: { ordre: 'asc' },
          select: {
            id: true,
            titre: true,
            ordre: true,
            _count: { select: { lecons: true } },
          },
        },
      },
    });
    res.json(modules);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const getModuleDetail = async (req, res) => {
  const moduleId = Number(req.params.id);
  try {
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        formation: true,
        cours: {
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
        },
      },
    });
    if (!module) return res.status(404).json({ message: 'Module introuvable' });
    res.json(module);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const createModule = async (req, res) => {
  const { formationId, titre, description, duree, heuresParSemaine, langages, competences, livrables, couleur, icone } = req.body;
  if (!formationId || !titre) return res.status(400).json({ message: 'Formation et titre obligatoires' });
  try {
    const module = await prisma.module.create({
      data: {
        formationId: Number(formationId),
        titre,
        description: description || null,
        duree: duree || 0,
        heuresParSemaine: heuresParSemaine || 0,
        langages: langages || [],
        competences: competences || [],
        livrables: livrables || [],
        couleur: couleur || '#C45C7A',
        icone: icone || '📚',
      },
    });
    res.status(201).json(module);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const updateModule = async (req, res) => {
  const { titre, description, duree, heuresParSemaine, langages, competences, livrables, couleur, icone, isActive } = req.body;
  const data = {};
  if (titre !== undefined) data.titre = titre;
  if (description !== undefined) data.description = description;
  if (duree !== undefined) data.duree = Number(duree);
  if (heuresParSemaine !== undefined) data.heuresParSemaine = Number(heuresParSemaine);
  if (langages !== undefined) data.langages = langages;
  if (competences !== undefined) data.competences = competences;
  if (livrables !== undefined) data.livrables = livrables;
  if (couleur !== undefined) data.couleur = couleur;
  if (icone !== undefined) data.icone = icone;
  if (isActive !== undefined) data.isActive = isActive;
  try {
    const module = await prisma.module.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(module);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Module introuvable' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const deleteModule = async (req, res) => {
  try {
    await prisma.module.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Module supprimé' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Module introuvable' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
