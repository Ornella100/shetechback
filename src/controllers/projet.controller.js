import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../lib/prisma.js';
import { getIO } from '../lib/socket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeProjetStatut(statut) {
  if (!statut || statut === 'en_cours') return 'en_cours';
  if (statut === 'lance' || statut === 'lancé') return 'lancé';
  if (statut === 'termine' || statut === 'terminé') return 'terminé';
  return null;
}

// URL publique d'un livrable (servi statiquement depuis /uploads) — un livrable est
// soit un fichier uploadé, soit un lien externe (jamais les deux).
const livrableAvecUrl = (l) => ({
  ...l,
  fichier_url: l.nomFichier ? `/uploads/livrables/${l.nomFichier}` : null,
  lien: l.lien || null,
});

const estStaff = (user) => user?.role === 'admin' || user?.role === 'mentor';

export const getProjets = async (req, res) => {
  const { origine } = req.query;
  try {
    const where = { userId: req.user.id };
    if (origine) where.origine = origine;
    const projets = await prisma.projet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        commentaires: { include: { user: { select: { nom: true } } }, orderBy: { createdAt: 'asc' } },
        livrables: true, likes: true, brief: true,
        mentor: { select: { nom: true } },
        user: { select: { nom: true } },
      },
    });
    res.json(projets.map(p => ({
      ...p, user_id: p.userId, lien_github: p.lienGithub, lien_demo: p.lienDemo,
      statut_evaluation: p.statutEvaluation, commentaire_mentor: p.commentaireMentor,
      statut_acceptation: p.statutAcceptation, is_public: p.isPublic,
      nom_mentor: p.mentor?.nom, created_at: p.createdAt, nb_likes: p.likes.length,
      livrables: p.livrables.map(livrableAvecUrl),
    })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getProjet = async (req, res) => {
  try {
    const projet = await prisma.projet.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        commentaires: { include: { user: { select: { nom: true } } }, orderBy: { createdAt: 'asc' } },
        livrables: true, likes: true, brief: true,
        user: { select: { nom: true } },
        mentor: { select: { nom: true } },
      },
    });
    if (!projet) return res.status(404).json({ message: 'Projet introuvable' });
    res.json({ ...projet, nb_likes: projet.likes.length, livrables: projet.livrables.map(livrableAvecUrl) });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Projets partagés dans la communauté — uniquement les projets personnels ("proposition"),
// jamais les projets assignés par SheTech.
export const getProjetsPublics = async (req, res) => {
  try {
    const projets = await prisma.projet.findMany({
      where: { isPublic: true, origine: 'proposition' },
      orderBy: { createdAt: 'desc' },
      include: {
        commentaires: { include: { user: { select: { nom: true } } }, orderBy: { createdAt: 'asc' } },
        livrables: true, likes: true,
        user: { select: { nom: true } },
      },
    });
    res.json(projets.map(p => ({
      ...p, user_id: p.userId, nom_auteur: p.user?.nom,
      lien_github: p.lienGithub, lien_demo: p.lienDemo,
      nb_likes: p.likes.length, created_at: p.createdAt,
      user_liked: req.user ? p.likes.some(l => l.userId === req.user.id) : false,
      commentaires: p.commentaires.map(c => ({ ...c, auteur_nom: c.user?.nom, created_at: c.createdAt })),
      livrables: p.livrables.map(livrableAvecUrl),
    })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getAdminProjets = async (req, res) => {
  try {
    const projets = await prisma.projet.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { nom: true } },
        mentor: { select: { nom: true } },
        livrables: true,
        brief: { select: { titre: true } },
      },
    });
    res.json(projets.map(p => ({
      ...p, user_id: p.userId, mentor_id: p.mentorId,
      nom_auteur: p.user?.nom, nom_mentor: p.mentor?.nom,
      brief_titre: p.brief?.titre, lien_github: p.lienGithub, lien_demo: p.lienDemo,
      statut_evaluation: p.statutEvaluation, commentaire_mentor: p.commentaireMentor,
      statut_acceptation: p.statutAcceptation, created_at: p.createdAt,
      livrables: p.livrables.map(livrableAvecUrl),
    })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createProjet = async (req, res) => {
  const { brief_id, titre, lien_github, lien_demo, description, is_public, domaine, technologies } = req.body;
  try {
    const p = await prisma.projet.create({
      data: {
        userId: req.user.id, briefId: brief_id ? Number(brief_id) : null,
        titre: titre || 'Mon projet',
        origine: 'proposition',
        domaine: domaine || null,
        technologies: technologies || undefined,
        lienGithub: lien_github || null, lienDemo: lien_demo || null,
        description: description || null, isPublic: is_public === true || is_public === 'true',
      },
    });
    res.status(201).json({ message: 'Projet créé', id: p.id });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /admin/projets/assigner — l'admin/mentor assigne un projet à une apprenante
// Le projet arrive avec statut_acceptation "en_attente" : l'apprenante doit l'accepter ou le refuser.
export const assignerProjet = async (req, res) => {
  const { user_id, brief_id, titre, description, mentor_id } = req.body;
  if (!user_id) return res.status(400).json({ message: "L'apprenante (user_id) est obligatoire" });
  if (!titre && !brief_id) return res.status(400).json({ message: 'Un titre ou un brief est obligatoire' });
  try {
    const p = await prisma.projet.create({
      data: {
        userId: Number(user_id),
        briefId: brief_id ? Number(brief_id) : null,
        mentorId: mentor_id ? Number(mentor_id) : req.user.id,
        titre: titre || 'Projet assigné',
        description: description || null,
        origine: 'assigne',
        statutAcceptation: 'en_attente',
        statut: 'en_cours',
      },
    });
    res.status(201).json({ message: 'Projet assigné', id: p.id });
  } catch (err) {
    if (err.code === 'P2003') return res.status(400).json({ message: 'Apprenante ou brief introuvable' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /projets/:id/reponse — l'apprenante accepte ou refuse un projet assigné par SheTech
export const repondreProjet = async (req, res) => {
  const { action } = req.body;
  if (!['accepter', 'refuser'].includes(action))
    return res.status(400).json({ message: "action doit être 'accepter' ou 'refuser'" });
  try {
    const projet = await prisma.projet.findUnique({ where: { id: Number(req.params.id) } });
    if (!projet) return res.status(404).json({ message: 'Projet introuvable' });
    if (projet.userId !== req.user.id) return res.status(403).json({ message: 'Accès non autorisé' });
    if (projet.origine !== 'assigne')
      return res.status(400).json({ message: 'Seuls les projets assignés par SheTech nécessitent une réponse' });
    await prisma.projet.update({
      where: { id: projet.id },
      data: { statutAcceptation: action === 'accepter' ? 'accepte' : 'refuse' },
    });
    res.json({ message: action === 'accepter' ? 'Projet accepté' : 'Projet refusé' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /projets/:id/partage — partager / retirer un projet personnel de la communauté
export const partagerProjet = async (req, res) => {
  const { is_public } = req.body;
  try {
    const projet = await prisma.projet.findUnique({ where: { id: Number(req.params.id) } });
    if (!projet) return res.status(404).json({ message: 'Projet introuvable' });
    if (projet.userId !== req.user.id) return res.status(403).json({ message: 'Accès non autorisé' });
    if (projet.origine === 'assigne')
      return res.status(403).json({ message: 'Les projets SheTech ne peuvent pas être partagés dans la communauté' });
    const updated = await prisma.projet.update({
      where: { id: projet.id },
      data: { isPublic: is_public === true || is_public === 'true' },
    });
    res.json({ message: updated.isPublic ? 'Projet partagé avec la communauté' : 'Projet retiré de la communauté', is_public: updated.isPublic });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateProjet = async (req, res) => {
  const { titre, lien_github, lien_demo, description, statut, is_public, domaine, technologies } = req.body;
  try {
    const projet = await prisma.projet.findUnique({ where: { id: Number(req.params.id) } });
    if (!projet) return res.status(404).json({ message: 'Projet introuvable' });
    if (projet.userId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Accès non autorisé' });
    // Les projets assignés par SheTech ne sont jamais publics
    const isPublic = projet.origine === 'assigne' ? false : (is_public === true || is_public === 'true' ? true : is_public === undefined ? projet.isPublic : false);
    // Ne modifier que les champs effectivement envoyés
    await prisma.projet.update({
      where: { id: projet.id },
      data: {
        titre: titre || projet.titre,
        lienGithub: lien_github === undefined ? projet.lienGithub : (lien_github || null),
        lienDemo: lien_demo === undefined ? projet.lienDemo : (lien_demo || null),
        description: description === undefined ? projet.description : (description || null),
        statut: statut === undefined ? projet.statut : (normalizeProjetStatut(statut) ?? projet.statut),
        domaine: domaine || projet.domaine,
        technologies: technologies ?? undefined,
        isPublic,
      },
    });
    res.json({ message: 'Projet mis à jour' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Projet introuvable' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteProjet = async (req, res) => {
  try {
    const projet = await prisma.projet.findUnique({ where: { id: Number(req.params.id) } });
    if (!projet) return res.status(404).json({ message: 'Projet introuvable' });
    if (projet.userId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Accès non autorisé' });
    if (projet.origine === 'assigne' && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Un projet assigné par SheTech ne peut pas être supprimé' });
    await prisma.projet.delete({ where: { id: projet.id } });
    res.json({ message: 'Projet supprimé' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Projet introuvable' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const addCommentaire = async (req, res) => {
  const { contenu } = req.body;
  if (!contenu) return res.status(400).json({ message: 'Le contenu est obligatoire' });
  try {
    const c = await prisma.projetCommentaire.create({
      data: { projetId: Number(req.params.id), userId: req.user.id, contenu },
      include: { user: { select: { nom: true } } },
    });
    res.status(201).json({ message: 'Commentaire ajouté', commentaire: { ...c, auteur_nom: c.user?.nom, created_at: c.createdAt } });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const toggleLike = async (req, res) => {
  const projetId = Number(req.params.id);
  const userId = req.user.id;
  try {
    const existing = await prisma.projetLike.findUnique({ where: { projetId_userId: { projetId, userId } } });
    if (existing) {
      await prisma.projetLike.delete({ where: { projetId_userId: { projetId, userId } } });
      const count = await prisma.projetLike.count({ where: { projetId } });
      return res.json({ liked: false, nb_likes: count });
    }
    await prisma.projetLike.create({ data: { projetId, userId } });
    const count = await prisma.projetLike.count({ where: { projetId } });
    res.json({ liked: true, nb_likes: count });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const evaluerProjet = async (req, res) => {
  const { statut_evaluation, commentaire_mentor, note } = req.body;
  if (!statut_evaluation) return res.status(400).json({ message: 'statut_evaluation est obligatoire' });
  try {
    await prisma.projet.update({
      where: { id: Number(req.params.id) },
      data: { statutEvaluation: statut_evaluation, commentaireMentor: commentaire_mentor || null, note: note || null, mentorId: req.user.id },
    });
    res.json({ message: 'Évaluation enregistrée' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Projet introuvable' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ── Messagerie projet (discussion apprenante ↔ SheTech sur un projet assigné) ──

async function verifierAccesMessagerie(req, res) {
  const projet = await prisma.projet.findUnique({ where: { id: Number(req.params.id) }, select: { userId: true, origine: true } });
  if (!projet) { res.status(404).json({ message: 'Projet introuvable' }); return null; }
  if (projet.userId !== req.user.id && !estStaff(req.user)) {
    res.status(403).json({ message: 'Accès non autorisé' }); return null;
  }
  if (projet.origine !== 'assigne') {
    res.status(400).json({ message: 'La messagerie est réservée aux projets assignés par SheTech' }); return null;
  }
  return projet;
}

export const getMessages = async (req, res) => {
  try {
    const projet = await verifierAccesMessagerie(req, res);
    if (!projet) return;
    const messages = await prisma.projetMessage.findMany({
      where: { projetId: Number(req.params.id) },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { nom: true, role: true } } },
    });
    res.json(messages.map(m => ({
      id: m.id, contenu: m.contenu, created_at: m.createdAt,
      user_id: m.userId, auteur_nom: m.user?.nom, auteur_role: m.user?.role,
      de_shetech: m.user?.role === 'admin' || m.user?.role === 'mentor',
    })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const envoyerMessage = async (req, res) => {
  const { contenu } = req.body;
  if (!contenu || !contenu.trim()) return res.status(400).json({ message: 'Le contenu est obligatoire' });
  try {
    const projet = await verifierAccesMessagerie(req, res);
    if (!projet) return;
    const m = await prisma.projetMessage.create({
      data: { projetId: Number(req.params.id), userId: req.user.id, contenu: contenu.trim() },
      include: { user: { select: { nom: true, role: true } } },
    });
    const message = {
      id: m.id, contenu: m.contenu, created_at: m.createdAt,
      user_id: m.userId, auteur_nom: m.user?.nom, auteur_role: m.user?.role,
      de_shetech: m.user?.role === 'admin' || m.user?.role === 'mentor',
    };
    const projetId = Number(req.params.id);
    if (req.user.id === projet.userId) getIO()?.to('staff').emit('message:projet', { projetId, message });
    else getIO()?.to(`user:${projet.userId}`).emit('message:projet', { projetId, message });
    res.status(201).json(message);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ── Livrables ──

export const getLivrables = async (req, res) => {
  const projetId = Number(req.params.id);
  try {
    const projet = await prisma.projet.findUnique({ where: { id: projetId }, select: { userId: true, isPublic: true, origine: true } });
    if (!projet) return res.status(404).json({ message: 'Projet introuvable' });
    const estPublicCommunaute = projet.isPublic && projet.origine === 'proposition';
    if (projet.userId !== req.user.id && !estStaff(req.user) && !estPublicCommunaute)
      return res.status(403).json({ message: 'Accès non autorisé' });
    const livrables = await prisma.livrable.findMany({ where: { projetId }, orderBy: { createdAt: 'desc' } });
    res.json(livrables.map(livrableAvecUrl));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

function lienValide(lien) {
  try {
    const u = new URL(lien);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export const uploadLivrable = async (req, res) => {
  const { titre, description, lien } = req.body;
  const projetId = Number(req.params.id);
  if (!req.file && !lien) return res.status(400).json({ message: 'Un fichier ou un lien est requis' });
  if (!req.file && lien && !lienValide(lien))
    return res.status(400).json({ message: 'Le lien doit être une URL http(s) valide' });
  try {
    const projet = await prisma.projet.findUnique({ where: { id: projetId }, select: { userId: true } });
    if (!projet) return res.status(404).json({ message: 'Projet introuvable' });
    if (projet.userId !== req.user.id && !estStaff(req.user))
      return res.status(403).json({ message: 'Accès non autorisé' });
    const data = {
      projetId, userId: req.user.id,
      titre: titre || req.file?.originalname || 'Lien',
      description: description || null,
    };
    if (req.file) {
      Object.assign(data, { nomFichier: req.file.filename, cheminFichier: req.file.path, typeFichier: req.file.mimetype, tailleFichier: req.file.size });
    } else {
      data.lien = lien.trim();
    }
    const l = await prisma.livrable.create({ data });
    res.status(201).json({ ...livrableAvecUrl(l), message: 'Livrable ajouté', nom_fichier: l.nomFichier });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteLivrable = async (req, res) => {
  try {
    const livrable = await prisma.livrable.findUnique({ where: { id: Number(req.params.id) } });
    if (!livrable) return res.status(404).json({ message: 'Livrable introuvable' });
    if (livrable.userId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Accès non autorisé' });
    if (livrable.cheminFichier) {
      const filePath = path.resolve(__dirname, '../../', livrable.cheminFichier);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await prisma.livrable.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Livrable supprimé' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Livrable introuvable' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
