import prisma from '../lib/prisma.js';

// GET /parcours — liste publique avec nombre de formations
export const getParcours = async (req, res) => {
  try {
    const parcours = await prisma.parcours.findMany({
      orderBy: [{ ordre: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { formations: true } } },
    });
    res.json(parcours.map(p => ({
      ...p,
      image_url: p.imageUrl,
      nb_formations: p._count.formations,
      created_at: p.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err });
  }
};

// GET /parcours/:id — détail + formations ordonnées + progression de l'utilisateur
export const getParcoursDetail = async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.user?.id;
  try {
    const parcours = await prisma.parcours.findUnique({
      where: { id },
      include: {
        formations: {
          orderBy: [{ ordre: 'asc' }, { id: 'asc' }],
          include: {
            _count: { select: { modules: true } },
            modules: {
              orderBy: { id: 'asc' },
              include: {
                cours: {
                  orderBy: { ordre: 'asc' },
                  include: {
                    lecons: { orderBy: { ordre: 'asc' } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!parcours) return res.status(404).json({ message: 'Parcours introuvable' });

    // Progression par formation pour l'utilisateur courant
    let progressionMap = {};
    if (userId) {
      const progs = await prisma.progressionFormation.findMany({
        where: { userId, formationId: { in: parcours.formations.map(f => f.id) } },
        select: { formationId: true, pourcentage: true },
      });
      progressionMap = Object.fromEntries(progs.map(p => [p.formationId, p.pourcentage]));
    }

    res.json({
      ...parcours,
      image_url: parcours.imageUrl,
      created_at: parcours.createdAt,
      formations: parcours.formations.map(f => ({
        ...f,
        created_at: f.createdAt,
        nb_modules: f._count.modules,
        progression: progressionMap[f.id] || 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err });
  }
};

// POST /parcours (admin)
export const createParcours = async (req, res) => {
  const { titre, description, image_url, ordre } = req.body;
  if (!titre || !description)
    return res.status(400).json({ message: 'Titre et description sont obligatoires' });
  try {
    const p = await prisma.parcours.create({
      data: {
        titre,
        description,
        imageUrl: image_url || null,
        ordre: ordre != null ? Number(ordre) : 0,
      },
    });
    res.status(201).json({ message: 'Parcours créé', id: p.id });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err });
  }
};

// PUT /parcours/:id (admin)
export const updateParcours = async (req, res) => {
  const { titre, description, image_url, ordre } = req.body;
  const data = {};
  if (titre !== undefined) data.titre = titre;
  if (description !== undefined) data.description = description;
  if (image_url !== undefined) data.imageUrl = image_url || null;
  if (ordre !== undefined) data.ordre = Number(ordre);
  try {
    await prisma.parcours.update({ where: { id: Number(req.params.id) }, data });
    res.json({ message: 'Parcours mis à jour' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Parcours introuvable' });
    res.status(500).json({ message: 'Erreur serveur', error: err });
  }
};

// DELETE /parcours/:id (admin) — les formations liées voient leur parcoursId mis à null (onDelete: SetNull)
export const deleteParcours = async (req, res) => {
  try {
    await prisma.parcours.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Parcours supprimé' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Parcours introuvable' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /parcours/:id/formations/ordre (admin) — réordonner les formations d'un parcours
// body: { ordres: [{ id, ordre }, ...] }
export const reordonnerFormations = async (req, res) => {
  const parcoursId = Number(req.params.id);
  const { ordres } = req.body;
  if (!Array.isArray(ordres))
    return res.status(400).json({ message: 'ordres doit être un tableau [{ id, ordre }]' });
  try {
    await prisma.$transaction(
      ordres.map(o =>
        prisma.formation.update({
          where: { id: Number(o.id) },
          data: { ordre: Number(o.ordre), parcoursId },
        })
      )
    );
    res.json({ message: 'Ordre mis à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err });
  }
};
