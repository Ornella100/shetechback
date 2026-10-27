import prisma from '../lib/prisma.js';

const MAX_RESULTS = 50;

function mapActualite(actualite) {
  return {
    ...actualite,
    image_principale: actualite.imagePrincipale,
    auteur_id: actualite.auteurId,
    auteur_nom: actualite.auteur?.nom || null,
    created_at: actualite.createdAt,
    updated_at: actualite.updatedAt,lolo
  };
}

// GET /actualites — articles publiés, accessibles sans compte
export const getActualitesPubliees = async (req, res) => {
  const search = String(req.query.search || '').trim();
  try {
    const actualites = await prisma.actualite.findMany({
      where: {
        publie: true,
        ...(search ? { OR: [
          { titre: { contains: search, mode: 'insensitive' } },
          { contenu: { contains: search, mode: 'insensitive' } },
        ] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_RESULTS,
      include: { auteur: { select: { nom: true } } },
    });
    res.json(actualites.map(mapActualite));
  } catch (err) {
    console.error('Erreur lecture actualités:', err);
    res.status(500).json({ message: 'Impossible de charger les actualités' });
  }
};

// GET /actualites/:id — un article publié
export const getActualitePubliee = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Identifiant invalide' });
  try {
    const actualite = await prisma.actualite.findFirst({
      where: { id, publie: true },
      include: { auteur: { select: { nom: true } } },
    });
    if (!actualite) return res.status(404).json({ message: 'Actualité introuvable' });
    res.json(mapActualite(actualite));
  } catch {
    res.status(500).json({ message: 'Impossible de charger cette actualité' });
  }
};

// GET /admin/actualites
export const getActualitesAdmin = async (_req, res) => {
  try {
    const actualites = await prisma.actualite.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { auteur: { select: { nom: true } } },
    });
    res.json(actualites.map(mapActualite));
  } catch {
    res.status(500).json({ message: 'Impossible de charger les actualités' });
  }
};

// POST /admin/actualites
export const creerActualite = async (req, res) => {
  const { titre, contenu, image_principale, publie = false } = req.body;
  if (!String(titre || '').trim() || !String(contenu || '').trim())
    return res.status(400).json({ message: 'Le titre et le contenu sont obligatoires' });
  if (image_principale && !estUrlHttp(image_principale))
    return res.status(400).json({ message: 'Le lien de l’image doit être une URL HTTP ou HTTPS valide' });
  try {
    const actualite = await prisma.actualite.create({
      data: {
        titre: String(titre).trim(),
        contenu: String(contenu).trim(),
        imagePrincipale: image_principale || null,
        publie: Boolean(publie),
        auteurId: req.user.id,
      },
      include: { auteur: { select: { nom: true } } },
    });
    res.status(201).json(mapActualite(actualite));
  } catch {
    res.status(500).json({ message: 'Impossible de créer cette actualité' });
  }
};

// PUT /admin/actualites/:id
export const modifierActualite = async (req, res) => {
  const id = Number(req.params.id);
  const { titre, contenu, image_principale, publie } = req.body;
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Identifiant invalide' });
  if (!String(titre || '').trim() || !String(contenu || '').trim())
    return res.status(400).json({ message: 'Le titre et le contenu sont obligatoires' });
  if (image_principale && !estUrlHttp(image_principale))
    return res.status(400).json({ message: 'Le lien de l’image doit être une URL HTTP ou HTTPS valide' });
  try {
    const actualite = await prisma.actualite.update({
      where: { id },
      data: {
        titre: String(titre).trim(),
        contenu: String(contenu).trim(),
        imagePrincipale: image_principale || null,
        publie: Boolean(publie),
      },
      include: { auteur: { select: { nom: true } } },
    });
    res.json(mapActualite(actualite));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Actualité introuvable' });
    res.status(500).json({ message: 'Impossible de modifier cette actualité' });
  }
};

// DELETE /admin/actualites/:id
export const supprimerActualite = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Identifiant invalide' });
  try {
    await prisma.actualite.delete({ where: { id } });
    res.json({ message: 'Actualité supprimée' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Actualité introuvable' });
    res.status(500).json({ message: 'Impossible de supprimer cette actualité' });
  }
};

function estUrlHttp(value) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}
