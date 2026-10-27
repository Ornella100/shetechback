import prisma from '../lib/prisma.js';

// Distance de Levenshtein — pour une recherche de membres tolérante aux fautes de frappe
// ("qui se ressemble"), en plus du simple "contains".
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
function similarite(a, b) {
  if (!a.length || !b.length) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}
function scoreNom(nom, q) {
  const nomLc = nom.toLowerCase();
  if (nomLc.includes(q)) return 1;
  const mots = nomLc.split(/\s+/);
  return Math.max(similarite(nomLc, q), ...mots.map((m) => similarite(m, q)));
}

export const getCommunityPostSimple = async (req, res) => {
  const { tag, search } = req.query;
  try {
    const where = {};
    if (tag) where.tags = { contains: tag, mode: 'insensitive' };
    if (search) where.OR = [{ titre: { contains: search, mode: 'insensitive' } }, { contenu: { contains: search, mode: 'insensitive' } }];

    const posts = await prisma.communityPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { nom: true } },
        _count: { select: { reponses: true } },
      },
    });

    // Votes (polymorphes, pas de relation Prisma) : total par post + vote du lecteur
    const postIds = posts.map(p => p.id);
    const votes = await prisma.communityVote.findMany({
      where: { targetType: 'post', targetId: { in: postIds } },
      select: { targetId: true, userId: true, valeur: true },
    });
    const totalVotes = {};
    const mesVotes = {};
    for (const v of votes) {
      totalVotes[v.targetId] = (totalVotes[v.targetId] || 0) + v.valeur;
      if (v.userId === req.user?.id) mesVotes[v.targetId] = v.valeur;
    }

    res.json(posts.map(p => ({
      id: p.id, user_id: p.userId, titre: p.titre, contenu: p.contenu,
      tags: p.tags, est_resolu: p.estResolu, created_at: p.createdAt,
      auteur_nom: p.user.nom, nb_reponses: p._count.reponses,
      nb_votes: totalVotes[p.id] || 0, mon_vote: mesVotes[p.id] || 0,
    })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createPost = async (req, res) => {
  const { titre, contenu, tags } = req.body;
  if (!titre || !contenu) return res.status(400).json({ message: 'Titre et contenu sont obligatoires' });
  try {
    const post = await prisma.communityPost.create({
      data: { userId: req.user.id, titre, contenu, tags: tags || null },
    });
    res.status(201).json({ message: 'Post créé', id: post.id });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getResponses = async (req, res) => {
  const postId = Number(req.params.id);
  const userId = req.user?.id || 0;
  try {
    const responses = await prisma.communityResponse.findMany({
      where: { postId },
      orderBy: [{ estSolution: 'desc' }, { createdAt: 'asc' }],
      include: {
        user: { select: { nom: true } },
      },
    });
    const votes = await prisma.communityVote.findMany({
      where: { targetType: 'reponse', targetId: { in: responses.map(r => r.id) } },
      select: { targetId: true, userId: true, valeur: true },
    });
    const totalVotes = {};
    const voteMap = {};
    for (const v of votes) {
      totalVotes[v.targetId] = (totalVotes[v.targetId] || 0) + v.valeur;
      if (v.userId === userId) voteMap[v.targetId] = v.valeur;
    }
    res.json(responses.map(r => ({
      id: r.id, post_id: r.postId, user_id: r.userId, contenu: r.contenu,
      est_solution: r.estSolution, created_at: r.createdAt,
      auteur_nom: r.user.nom, nb_votes: totalVotes[r.id] || 0, mon_vote: voteMap[r.id] || 0,
    })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createResponse = async (req, res) => {
  const { contenu } = req.body;
  if (!contenu) return res.status(400).json({ message: 'Le contenu est obligatoire' });
  try {
    const r = await prisma.communityResponse.create({
      data: { postId: Number(req.params.id), userId: req.user.id, contenu },
    });
    res.status(201).json({ message: 'Réponse ajoutée', id: r.id });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const markSolution = async (req, res) => {
  const reponseId = Number(req.params.id);
  try {
    const reponse = await prisma.communityResponse.findUnique({ where: { id: reponseId }, select: { postId: true } });
    if (!reponse) return res.status(404).json({ message: 'Réponse introuvable' });
    const post = await prisma.communityPost.findUnique({ where: { id: reponse.postId }, select: { userId: true } });
    if (!post) return res.status(404).json({ message: 'Post introuvable' });
    if (post.userId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Non autorisé' });

    await prisma.$transaction([
      prisma.communityResponse.updateMany({ where: { postId: reponse.postId }, data: { estSolution: false } }),
      prisma.communityResponse.update({ where: { id: reponseId }, data: { estSolution: true } }),
      prisma.communityPost.update({ where: { id: reponse.postId }, data: { estResolu: true } }),
    ]);
    res.json({ message: 'Réponse marquée comme solution' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const vote = async (req, res) => {
  const { target_type, target_id, valeur } = req.body;
  if (!target_type || !target_id || valeur === undefined)
    return res.status(400).json({ message: 'target_type, target_id et valeur sont obligatoires' });
  if (![-1, 0, 1].includes(Number(valeur)))
    return res.status(400).json({ message: 'valeur doit être -1, 0 ou 1' });
  try {
    await prisma.communityVote.upsert({
      where: { userId_targetType_targetId: { userId: req.user.id, targetType: target_type, targetId: Number(target_id) } },
      update: { valeur: Number(valeur) },
      create: { userId: req.user.id, targetType: target_type, targetId: Number(target_id), valeur: Number(valeur) },
    });
    res.json({ message: 'Vote enregistré' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getCommunityUsers = async (req, res) => {
  const { search } = req.query;
  try {
    const users = await prisma.user.findMany({
      orderBy: { dateCreation: 'desc' },
      select: { id: true, nom: true, role: true, niveau: true, bio: true, dateCreation: true, _count: { select: { communityPosts: true, communityResponses: true, followers: true } } },
    });
    const [mesSuivis, mesSuiveurs] = await Promise.all([
      prisma.userFollow.findMany({ where: { followerId: req.user.id }, select: { followingId: true } }),
      prisma.userFollow.findMany({ where: { followingId: req.user.id }, select: { followerId: true } }),
    ]);
    const suivisSet = new Set(mesSuivis.map(f => f.followingId));
    const suiveursSet = new Set(mesSuiveurs.map(f => f.followerId));

    let liste = users.filter(u => u.id !== req.user.id);
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      liste = liste
        .map(u => ({ u, score: scoreNom(u.nom, q) }))
        .filter(({ score }) => score >= 0.45)
        .sort((a, b) => b.score - a.score)
        .map(({ u }) => u);
    }

    res.json(liste.map(u => ({
      id: u.id, nom: u.nom, role: u.role, niveau: u.niveau, bio: u.bio,
      date_creation: u.dateCreation, nb_posts: u._count.communityPosts, nb_reponses: u._count.communityResponses,
      nb_followers: u._count.followers, est_suivi: suivisSet.has(u.id),
      est_suiveur: suiveursSet.has(u.id), est_mutuel: suivisSet.has(u.id) && suiveursSet.has(u.id),
    })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getUserProfile = async (req, res) => {
  const targetId = Number(req.params.id);
  const viewerId = req.user?.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true, nom: true, role: true, niveau: true, bio: true, dateCreation: true,
        _count: { select: { communityPosts: true, communityResponses: true, followers: true, follows: true } },
      },
    });
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    let estSuivi = false;
    let estSuiveur = false;
    if (viewerId) {
      const [follow, followBack] = await Promise.all([
        prisma.userFollow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: targetId } } }),
        prisma.userFollow.findUnique({ where: { followerId_followingId: { followerId: targetId, followingId: viewerId } } }),
      ]);
      estSuivi = !!follow;
      estSuiveur = !!followBack;
    }

    const posts = await prisma.communityPost.findMany({
      where: { userId: targetId }, orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, titre: true, createdAt: true, estResolu: true, _count: { select: { reponses: true } } },
    });
    res.json({
      ...user, date_creation: user.dateCreation,
      nb_posts: user._count.communityPosts, nb_reponses: user._count.communityResponses,
      nb_followers: user._count.followers, nb_following: user._count.follows,
      est_suivi: estSuivi, est_suiveur: estSuiveur, est_mutuel: estSuivi && estSuiveur, posts_recents: posts,
    });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateCommunityProfile = async (req, res) => {
  const { bio, niveau } = req.body;
  try {
    await prisma.user.update({ where: { id: req.user.id }, data: { bio: bio || null, niveau: niveau || null } });
    res.json({ message: 'Profil mis à jour' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const follow = async (req, res) => {
  const followingId = Number(req.params.id);
  if (followingId === req.user.id) return res.status(400).json({ message: 'Vous ne pouvez pas vous suivre vous-même' });
  try {
    await prisma.userFollow.create({ data: { followerId: req.user.id, followingId } });
    res.json({ message: 'Utilisateur suivi' });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Vous suivez déjà cet utilisateur' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const unfollow = async (req, res) => {
  const followingId = Number(req.params.id);
  try {
    await prisma.userFollow.delete({ where: { followerId_followingId: { followerId: req.user.id, followingId } } });
    res.json({ message: 'Utilisateur non suivi' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Vous ne suivez pas cet utilisateur' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
