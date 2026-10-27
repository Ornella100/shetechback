import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { getStatutAcces } from '../lib/abonnement.js';

// Auth optionnelle : la route reste publique (navigation), mais si un token valide
// est fourni on détermine si le contenu des leçons doit être dépouillé (essai expiré).
async function accesContenuDepuisRequete(req) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return false;
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const statut = await getStatutAcces(user.id);
    return statut.acces;
  } catch {
    return false;
  }
}

export const getFormations = async (req, res) => {
  const { domaine, parcoursId } = req.query;
  try {
    const where = {};
    if (domaine) where.domaine = { equals: domaine, mode: 'insensitive' };
    if (parcoursId) where.parcoursId = Number(parcoursId);
    const formations = await prisma.formation.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: parcoursId ? [{ ordre: 'asc' }, { id: 'asc' }] : { createdAt: 'desc' },
    });
    res.json(formations);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const getFormation = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const formation = await prisma.formation.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { id: 'asc' },
          include: {
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
        },
      },
    });
    if (!formation) return res.status(404).json({ message: 'Formation introuvable' });

    const accesContenu = await accesContenuDepuisRequete(req);
    if (!accesContenu) {
      // Essai expiré ou visiteur : la structure reste visible, le contenu est verrouillé
      formation.modules?.forEach(m => m.cours?.forEach(c => c.lecons?.forEach(l => {
        l.contenuTexte = null;
        l.videos = [];
        l.audios = [];
        l.pieceJointes = [];
        l.verrouille = true;
      })));
      formation.accesRestreint = true;
    }
    res.json(formation);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const createFormation = async (req, res) => {
  const { titre, description, niveau, prix, domaine, parcours_id, ordre } = req.body;
  if (!titre || !description || !niveau || !domaine)
    return res.status(400).json({ message: 'Titre, description, niveau et domaine sont obligatoires' });
  try {
    const f = await prisma.formation.create({
      data: {
        titre,
        description,
        niveau,
        prix: prix || 0,
        domaine,
        parcoursId: parcours_id ? Number(parcours_id) : null,
        ordre: ordre != null ? Number(ordre) : 0,
      },
    });
    res.status(201).json({ message: 'Formation créée', id: f.id });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const updateFormation = async (req, res) => {
  const { titre, description, niveau, prix, domaine, parcours_id, ordre } = req.body;
  const data = {};
  if (titre !== undefined) data.titre = titre;
  if (description !== undefined) data.description = description;
  if (niveau !== undefined) data.niveau = niveau;
  if (prix !== undefined) data.prix = prix;
  if (domaine !== undefined) data.domaine = domaine;
  if (parcours_id !== undefined) data.parcoursId = parcours_id ? Number(parcours_id) : null;
  if (ordre !== undefined) data.ordre = Number(ordre);
  try {
    await prisma.formation.update({ where: { id: Number(req.params.id) }, data });
    res.json({ message: 'Formation mise à jour' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Formation introuvable' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const deleteFormation = async (req, res) => {
  try {
    await prisma.formation.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Formation supprimée' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Formation introuvable' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const getProjetsBriefs = async (req, res) => {
  const formationId = Number(req.params.id);
  const userId = req.user.id;
  try {
    const briefs = await prisma.projetBrief.findMany({
      where: { formationId },
      orderBy: { createdAt: 'asc' },
      include: {
        projets: {
          where: { userId },
          select: {
            id: true,
            lienGithub: true,
            lienDemo: true,
            description: true,
            statutEvaluation: true,
            commentaireMentor: true,
          },
        },
      },
    });
    const result = briefs.map(b => {
      const soumission = b.projets[0] || null;
      return {
        ...b,
        soumission: soumission ? { id: soumission.id, ...soumission } : null,
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const getAdminProjetsBriefs = async (req, res) => {
  try {
    const briefs = await prisma.projetBrief.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        formation: { select: { id: true, titre: true } },
        _count: { select: { projets: true } },
      },
    });
    res.json(briefs);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const createProjetBrief = async (req, res) => {
  const { formationId, titre, description, consignes, livrables } = req.body;
  if (!formationId || !titre) return res.status(400).json({ message: 'Formation et titre obligatoires' });
  try {
    const brief = await prisma.projetBrief.create({
      data: {
        formationId: Number(formationId),
        titre,
        description: description || null,
        consignes: consignes || null,
        livrables: livrables || null,
      },
    });
    res.status(201).json(brief);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const updateProjetBrief = async (req, res) => {
  const { titre, description, consignes, livrables } = req.body;
  const data = {};
  if (titre !== undefined) data.titre = titre;
  if (description !== undefined) data.description = description;
  if (consignes !== undefined) data.consignes = consignes;
  if (livrables !== undefined) data.livrables = livrables;
  try {
    const brief = await prisma.projetBrief.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(brief);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Brief introuvable' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const deleteProjetBrief = async (req, res) => {
  try {
    await prisma.projetBrief.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Brief supprimé' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Brief introuvable' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
