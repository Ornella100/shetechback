import prisma from '../lib/prisma.js';

export const getLecons = async (req, res) => {
  const coursId = Number(req.params.coursId);
  try {
    const lecons = await prisma.lecon.findMany({
      where: { coursId, isActive: true },
      orderBy: { ordre: 'asc' },
      include: {
        videos: true,
        audios: true,
        pieceJointes: true,
      },
    });
    res.json(lecons);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const getLeconDetail = async (req, res) => {
  const leconId = Number(req.params.id);
  try {
    const lecon = await prisma.lecon.findUnique({
      where: { id: leconId },
      include: {
        cours: {
          include: { module: { include: { formation: true } } },
        },
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
    });
    if (!lecon) return res.status(404).json({ message: 'Leçon introuvable' });
    res.json(lecon);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const createLecon = async (req, res) => {
  const { coursId, titre, description, type, ordre, dureeMinutes, contenuTexte } = req.body;
  if (!coursId || !titre) return res.status(400).json({ message: 'Cours et titre obligatoires' });
  try {
    const lecon = await prisma.lecon.create({
      data: {
        coursId: Number(coursId),
        titre,
        description: description || null,
        type: type || 'pratique',
        ordre: ordre || 1,
        dureeMinutes: dureeMinutes || 0,
        contenuTexte: contenuTexte || null,
      },
    });
    res.status(201).json(lecon);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const updateLecon = async (req, res) => {
  const { titre, description, type, ordre, dureeMinutes, contenuTexte, isActive } = req.body;
  const data = {};
  if (titre !== undefined) data.titre = titre;
  if (description !== undefined) data.description = description;
  if (type !== undefined) data.type = type;
  if (ordre !== undefined) data.ordre = Number(ordre);
  if (dureeMinutes !== undefined) data.dureeMinutes = Number(dureeMinutes);
  if (contenuTexte !== undefined) data.contenuTexte = contenuTexte;
  if (isActive !== undefined) data.isActive = isActive;
  try {
    const lecon = await prisma.lecon.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(lecon);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Leçon introuvable' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const deleteLecon = async (req, res) => {
  try {
    await prisma.lecon.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Leçon supprimée' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Leçon introuvable' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const markLeconComplete = async (req, res) => {
  const leconId = Number(req.params.id);
  const userId = req.user.id;
  const { tempsPasseMinutes } = req.body;
  try {
    const progression = await prisma.progressionLecon.upsert({
      where: { userId_leconId: { userId, leconId } },
      update: {
        completee: true,
        dateCompletee: new Date(),
        tempsPasseMinutes: tempsPasseMinutes || 0,
      },
      create: {
        userId,
        leconId,
        completee: true,
        dateCompletee: new Date(),
        tempsPasseMinutes: tempsPasseMinutes || 0,
      },
    });
    res.json(progression);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Upload d'une image de contenu (éditeur riche) — renvoie l'URL absolue à insérer
export const uploadImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Aucune image reçue' });
  const url = `${req.protocol}://${req.get('host')}/uploads/images/${req.file.filename}`;
  res.status(201).json({ url });
};

export const addVideo = async (req, res) => {
  const leconId = Number(req.params.leconId);
  const { titre, url, type } = req.body;
  if (!url) return res.status(400).json({ message: 'URL obligatoire' });
  try {
    const video = await prisma.video.create({
      data: {
        leconId,
        titre: titre || null,
        url,
        type: type || 'embed',
      },
    });
    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const addAudio = async (req, res) => {
  const leconId = Number(req.params.leconId);
  const { titre, url, type } = req.body;
  if (!url) return res.status(400).json({ message: 'URL obligatoire' });
  try {
    const audio = await prisma.audio.create({
      data: {
        leconId,
        titre: titre || null,
        url,
        type: type || 'embed',
      },
    });
    res.status(201).json(audio);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const addPieceJointe = async (req, res) => {
  const leconId = Number(req.params.leconId);
  const { nom, url, source, type, taille } = req.body;
  if (!nom || !url) return res.status(400).json({ message: 'Nom et URL obligatoires' });
  try {
    const piece = await prisma.pieceJointe.create({
      data: {
        leconId,
        nom,
        url,
        source: source || 'upload',
        type: type || 'autre',
        taille: taille || null,
      },
    });
    res.status(201).json(piece);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    await prisma.video.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Vidéo supprimée' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Vidéo introuvable' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const deleteAudio = async (req, res) => {
  try {
    await prisma.audio.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Audio supprimé' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Audio introuvable' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const deletePieceJointe = async (req, res) => {
  try {
    await prisma.pieceJointe.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Fichier supprimé' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Fichier introuvable' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
