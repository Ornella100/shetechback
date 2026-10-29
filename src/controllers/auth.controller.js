import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { sendResetEmail } from '../lib/mailer.js';
import { uploadImage } from '../lib/cloudinary.js';
import { attribuerBadges } from '../lib/badges.js';
import { getOnlineUserIds } from '../lib/socket.js';

const profilPublic = (u) => ({
  id: u.id, nom: u.nom, email: u.email, role: u.role,
  niveau: u.niveau, bio: u.bio, avatar: u.avatar, telephone: u.telephone,
  formation_principale: u.formationPrincipale, date_creation: u.dateCreation,
});

// GET /profil — profil de l'utilisateur connecté
export const getProfil = async (req, res) => {
  try {
    await attribuerBadges(req.user.id);
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { achievements: { orderBy: { earnedAt: 'desc' } } },
    });
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json({
      ...profilPublic(user),
      badges: user.achievements.map(({ id, badgeName, description, earnedAt }) => ({
        id, nom: badgeName, description, obtenu_le: earnedAt,
      })),
    });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT /profil — met à jour nom, téléphone, bio, niveau, formation principale
export const updateProfil = async (req, res) => {
  const { nom, telephone, bio, niveau, formation_principale } = req.body;
  const data = {};
  if (nom !== undefined) data.nom = nom.trim().replace(/\s+/g, ' ');
  if (telephone !== undefined) data.telephone = telephone || null;
  if (bio !== undefined) data.bio = bio || null;
  if (niveau !== undefined) data.niveau = niveau || null;
  if (formation_principale !== undefined) data.formationPrincipale = formation_principale || null;
  try {
    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ message: 'Profil mis à jour', user: profilPublic(user) });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Ce nom est déjà utilisé' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /profil/avatar — upload de l'avatar vers Cloudinary
export const updateAvatar = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Aucune image reçue' });
  try {
    const url = await uploadImage(req.file.buffer, { folder: 'shetech/avatars' });
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { avatar: url } });
    res.json({ message: 'Avatar mis à jour', avatar: url, user: profilPublic(user) });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erreur lors de l\'upload' });
  }
};

export const register = async (req, res) => {
  const { nom, email, mot_de_passe } = req.body;
  if (!nom || !email || !mot_de_passe)
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });

  const normalizedNom = nom.trim().replace(/\s+/g, ' ');
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedNom || !normalizedEmail)
    return res.status(400).json({ message: 'Nom et email sont obligatoires' });
  if (mot_de_passe.length < 6)
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { nom: { equals: normalizedNom, mode: 'insensitive' } }] },
      select: { email: true, nom: true },
    });
    if (existing) {
      if (existing.email.toLowerCase() === normalizedEmail)
        return res.status(409).json({ message: 'Cet email est déjà utilisé' });
      return res.status(409).json({ message: 'Un compte existe déjà avec ce prénom et ce nom' });
    }

    const hash = await bcrypt.hash(mot_de_passe, 10);
    const user = await prisma.user.create({
      data: {
        nom: normalizedNom, email: normalizedEmail, motDePasse: hash, role: 'apprenante',
        // 1 mois d'essai gratuit à partir de la création du compte
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    res.status(201).json({ message: 'Compte créé avec succès', id: user.id });
  } catch (err) {
    if (err.code === 'P2002') {
      const target = err.meta?.target || [];
      if (target.includes('email')) return res.status(409).json({ message: 'Cet email est déjà utilisé' });
      return res.status(409).json({ message: 'Un compte existe déjà avec ce prénom et ce nom' });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const login = async (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email || !mot_de_passe)
    return res.status(400).json({ message: 'Email et mot de passe obligatoires' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Aucun compte trouvé avec cet email' });

    let match = false;
    try { match = await bcrypt.compare(mot_de_passe, user.motDePasse); } catch {}

    if (!match && user.motDePasse === mot_de_passe) {
      match = true;
      const newHash = await bcrypt.hash(mot_de_passe, 10);
      await prisma.user.update({ where: { id: user.id }, data: { motDePasse: newHash } });
    }

    if (!match) return res.status(401).json({ message: 'Mot de passe incorrect' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({
      message: 'Connexion réussie', token,
      user: { id: user.id, nom: user.nom, email: user.email, role: user.role, niveau: user.niveau, avatar: user.avatar, telephone: user.telephone },
    });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email obligatoire' });
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return res.json({ message: 'Si cet email existe, un lien a été envoyé.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000);
    await prisma.passwordResetToken.create({ data: { email, token, expiresAt } });

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    await sendResetEmail(email, resetLink);
    res.json({ message: 'Si cet email existe, un lien a été envoyé.' });
  } catch (err) {
    console.error('Erreur forgot-password:', err);
    res.status(500).json({ message: "Erreur lors de l'envoi de l'email." });
  }
};

export const validateResetToken = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Token manquant' });
  try {
    const record = await prisma.passwordResetToken.findFirst({
      where: { token, used: false, expiresAt: { gt: new Date() } },
    });
    if (!record) return res.status(400).json({ message: 'Lien invalide ou expiré.' });
    res.json({ valid: true });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ message: 'Token et nouveau mot de passe obligatoires' });
  if (newPassword.length < 6)
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });

  try {
    const record = await prisma.passwordResetToken.findFirst({
      where: { token, used: false, expiresAt: { gt: new Date() } },
    });
    if (!record) return res.status(400).json({ message: 'Lien invalide ou expiré.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { email: record.email }, data: { motDePasse: hashed } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    ]);
    res.json({ message: 'Mot de passe mis à jour avec succès !' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getAdminUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { dateCreation: 'desc' },
      select: { id: true, nom: true, email: true, role: true, niveau: true, dateCreation: true },
    });
    const onlineIds = new Set(getOnlineUserIds());
    res.json(users.map(u => ({
      ...u,
      niveau: u.role === 'admin' ? null : u.niveau,
      date_creation: u.dateCreation,
      is_online: onlineIds.has(u.id),
    })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!['apprenante', 'admin'].includes(role))
    return res.status(400).json({ message: 'Rôle invalide' });
  try {
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { role, ...(role === 'admin' ? { niveau: null } : {}) },
    });
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json({ message: 'Rôle mis à jour' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
