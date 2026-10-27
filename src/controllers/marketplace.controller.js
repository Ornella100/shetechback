import prisma from '../lib/prisma.js';
import { Transaction } from '../lib/fedapay.js';
import { uploadImage } from '../lib/cloudinary.js';

export const getProduits = async (req, res) => {
  const { categorie } = req.query;
  try {
    const produits = await prisma.marketplaceProduit.findMany({
      where: { estActive: true, ...(categorie ? { categorie: { equals: categorie, mode: 'insensitive' } } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { vendeur: { select: { nom: true } } },
    });
    res.json(produits.map(p => ({ ...p, vendeur_nom: p.vendeur?.nom, created_at: p.createdAt })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getMesProduits = async (req, res) => {
  try {
    const produits = await prisma.marketplaceProduit.findMany({
      where: { vendeurId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(produits.map(p => ({ ...p, created_at: p.createdAt })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createProduit = async (req, res) => {
  const { titre, description, prix, categorie, image_url } = req.body;
  if (!titre || !description || prix === undefined || !categorie)
    return res.status(400).json({ message: 'Titre, description, prix et categorie sont obligatoires' });
  if (!Number.isSafeInteger(Number(prix)) || Number(prix) <= 0)
    return res.status(400).json({ message: 'Le prix doit être un montant entier supérieur à zéro en XOF' });
  try {
    const p = await prisma.marketplaceProduit.create({
      data: { vendeurId: req.user.id, titre, description, prix: Number(prix), categorie, imageUrl: image_url || null },
    });
    res.status(201).json({ message: 'Produit créé', id: p.id });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const uploadMarketplaceImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choisissez une image JPEG, PNG, WebP ou GIF' });
  try {
    const image_url = await uploadImage(req.file.buffer, { folder: 'shetech/marketplace' });
    res.json({ image_url });
  } catch (err) {
    res.status(503).json({ message: err.message || 'Impossible d’envoyer cette image' });
  }
};

export const updateProduit = async (req, res) => {
  const { titre, description, prix, categorie, image_url } = req.body;
  if (!titre || !description || !categorie || !Number.isSafeInteger(Number(prix)) || Number(prix) <= 0)
    return res.status(400).json({ message: 'Titre, description, catégorie et prix valide sont obligatoires' });
  try {
    const existing = await prisma.marketplaceProduit.findUnique({ where: { id: Number(req.params.id) }, select: { vendeurId: true } });
    if (!existing) return res.status(404).json({ message: 'Produit introuvable' });
    if (existing.vendeurId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Non autorisé' });
    await prisma.marketplaceProduit.update({
      where: { id: Number(req.params.id) },
      data: { titre, description, prix: Number(prix), categorie, imageUrl: image_url || null },
    });
    res.json({ message: 'Produit mis à jour' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Produit introuvable' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteProduit = async (req, res) => {
  try {
    const existing = await prisma.marketplaceProduit.findUnique({ where: { id: Number(req.params.id) }, select: { vendeurId: true } });
    if (!existing) return res.status(404).json({ message: 'Produit introuvable' });
    if (existing.vendeurId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Non autorisé' });
    await prisma.marketplaceProduit.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Produit supprimé' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Produit introuvable' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getPanier = async (req, res) => {
  try {
    const items = await prisma.marketplacePanier.findMany({
      where: { acheteurId: req.user.id },
      include: { produit: { include: { vendeur: { select: { nom: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items.map(i => ({
      ...i, produit_titre: i.produit?.titre, produit_prix: i.produit?.prix,
      vendeur_nom: i.produit?.vendeur?.nom, created_at: i.createdAt,
    })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const ajouterPanier = async (req, res) => {
  const { produit_id, quantite = 1 } = req.body;
  const produitId = Number(produit_id);
  const nombre = Number(quantite);
  if (!Number.isInteger(produitId) || produitId < 1 || !Number.isInteger(nombre) || nombre < 1 || nombre > 99)
    return res.status(400).json({ message: 'Produit ou quantité invalide (1 à 99)' });
  try {
    const produit = await prisma.marketplaceProduit.findUnique({
      where: { id: produitId }, select: { vendeurId: true, estActive: true },
    });
    if (!produit || !produit.estActive) return res.status(404).json({ message: 'Annonce indisponible' });
    if (produit.vendeurId === req.user.id) return res.status(400).json({ message: 'Vous ne pouvez pas ajouter votre propre annonce au panier' });
    const existant = await prisma.marketplacePanier.findUnique({
      where: { acheteurId_produitId: { acheteurId: req.user.id, produitId } }, select: { quantite: true },
    });
    if ((existant?.quantite || 0) + nombre > 99)
      return res.status(400).json({ message: 'La quantité maximale par annonce est 99' });
    await prisma.marketplacePanier.upsert({
      where: { acheteurId_produitId: { acheteurId: req.user.id, produitId } },
      update: { quantite: { increment: nombre } },
      create: { acheteurId: req.user.id, produitId, quantite: nombre },
    });
    res.json({ message: 'Produit ajouté au panier' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const modifierQuantitePanier = async (req, res) => {
  const { quantite } = req.body;
  if (!Number.isInteger(Number(quantite)) || Number(quantite) < 1 || Number(quantite) > 99)
    return res.status(400).json({ message: 'La quantité doit être comprise entre 1 et 99' });
  try {
    const item = await prisma.marketplacePanier.findFirst({ where: { id: Number(req.params.id), acheteurId: req.user.id } });
    if (!item) return res.status(404).json({ message: 'Article introuvable dans le panier' });
    await prisma.marketplacePanier.update({ where: { id: Number(req.params.id) }, data: { quantite: Number(quantite) } });
    res.json({ message: 'Quantité mise à jour' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const supprimerPanier = async (req, res) => {
  try {
    const item = await prisma.marketplacePanier.findFirst({ where: { id: Number(req.params.id), acheteurId: req.user.id } });
    if (!item) return res.status(404).json({ message: 'Article introuvable dans le panier' });
    await prisma.marketplacePanier.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Article supprimé du panier' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const commander = async (req, res) => {
  try {
    if (!process.env.FEDAPAY_SECRET_KEY)
      return res.status(503).json({ message: 'Le paiement Marketplace n’est pas configuré. Contactez l’équipe SheTech.' });

    const panier = await prisma.marketplacePanier.findMany({
      where: { acheteurId: req.user.id },
      include: { produit: { select: { id: true, titre: true, prix: true, vendeurId: true, estActive: true } } },
    });
    if (panier.length === 0) return res.status(400).json({ message: 'Votre panier est vide' });
    if (panier.some((item) => item.produit.vendeurId === req.user.id))
      return res.status(400).json({ message: 'Vous ne pouvez pas commander votre propre annonce' });
    if (panier.some((item) => !item.produit.estActive))
      return res.status(409).json({ message: 'Une annonce du panier n’est plus disponible. Actualisez votre panier.' });

    const total = panier.reduce((sum, item) => sum + Number(item.produit.prix) * item.quantite, 0);
    if (!Number.isSafeInteger(total) || total < 1)
      return res.status(400).json({ message: 'Le total du panier doit être un montant entier supérieur à zéro' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { nom: true, email: true } });
    if (!user) return res.status(404).json({ message: 'Utilisatrice introuvable' });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const transaction = await Transaction.create({
      description: `Commande Marketplace SheTech (${panier.length} article${panier.length > 1 ? 's' : ''})`,
      amount: total,
      currency: { iso: 'XOF' },
      callback_url: `${frontendUrl}/dashboard/marketplace?retour=1`,
      customer: {
        firstname: user.nom.split(' ')[0] || user.nom,
        lastname: user.nom.split(' ').slice(1).join(' ') || user.nom,
        email: user.email,
      },
    });
    const paymentToken = await transaction.generateToken();

    const commandes = panier.map(item => ({
      acheteurId: req.user.id,
      produitId: item.produitId,
      vendeurId: item.produit.vendeurId,
      quantite: item.quantite,
      prixUnitaire: item.produit.prix,
      prixTotal: Number(item.produit.prix) * item.quantite,
      modePaiement: 'fedapay',
      statut: 'paiement_en_attente',
      fedapayTransactionId: String(transaction.id),
    }));

    const ids = await prisma.$transaction(async (tx) => {
      const created = await Promise.all(commandes.map(c => tx.marketplaceCommande.create({ data: c })));
      await tx.marketplacePanier.deleteMany({ where: { acheteurId: req.user.id } });
      return created.map(c => c.id);
    });

    res.status(201).json({ message: 'Paiement à finaliser', commande_ids: ids, transaction_id: transaction.id, url: paymentToken.url });
  } catch (err) {
    console.error('Erreur checkout Marketplace:', err);
    res.status(500).json({ message: 'Impossible de créer le paiement Marketplace' });
  }
};

export const getMesCommandes = async (req, res) => {
  try {
    const commandes = await prisma.marketplaceCommande.findMany({
      where: { acheteurId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { produit: { select: { titre: true, imageUrl: true } }, vendeur: { select: { nom: true } } },
    });
    res.json(commandes.map(c => ({
      ...c, produit_titre: c.produit?.titre, produit_image: c.produit?.imageUrl,
      vendeur_nom: c.vendeur?.nom, created_at: c.createdAt, prix_total: c.prixTotal,
    })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /marketplace/ventes — commandes de la vendeuse (admin peut tout consulter)
export const getMesVentes = async (req, res) => {
  try {
    const commandes = await prisma.marketplaceCommande.findMany({
      where: req.user.role === 'admin' ? undefined : { vendeurId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        produit: { select: { titre: true, imageUrl: true } },
        acheteur: { select: { nom: true } },
        vendeur: { select: { nom: true } },
      },
    });
    res.json(commandes.map((c) => ({
      ...c, produit_titre: c.produit?.titre, produit_image: c.produit?.imageUrl,
      acheteur_nom: c.acheteur?.nom, vendeur_nom: c.vendeur?.nom,
      created_at: c.createdAt, prix_total: c.prixTotal,
    })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const STATUTS_VENTE = new Set(['en_preparation', 'expediee', 'terminee']);

// PUT /marketplace/commandes/:id/statut — vendeur de la commande ou admin
export const changerStatutCommande = async (req, res) => {
  const statut = String(req.body.statut || '');
  if (!STATUTS_VENTE.has(statut))
    return res.status(400).json({ message: 'Statut de commande invalide' });
  try {
    const commande = await prisma.marketplaceCommande.findUnique({ where: { id: Number(req.params.id) } });
    if (!commande) return res.status(404).json({ message: 'Commande introuvable' });
    if (commande.vendeurId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Seule la vendeuse concernée peut gérer cette commande' });
    if (!['payee', 'en_preparation', 'expediee'].includes(commande.statut))
      return res.status(409).json({ message: 'Cette commande doit être payée avant son traitement' });
    const prochaineEtape = { payee: 'en_preparation', en_preparation: 'expediee', expediee: 'terminee' };
    if (prochaineEtape[commande.statut] !== statut)
      return res.status(409).json({ message: 'La commande doit suivre les étapes de traitement dans l’ordre' });
    await prisma.marketplaceCommande.update({ where: { id: commande.id }, data: { statut } });
    res.json({ message: 'Statut de commande mis à jour' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

async function appliquerStatutTransactionMarketplace(transactionId, fedapayStatus) {
  const map = { approved: 'payee', declined: 'paiement_refuse', canceled: 'paiement_annule' };
  const statut = map[fedapayStatus];
  if (!statut) return;
  await prisma.marketplaceCommande.updateMany({
    where: { fedapayTransactionId: String(transactionId), statut: 'paiement_en_attente' },
    data: { statut },
  });
}

// GET /marketplace/verifier-transaction/:id — vérifie et synchronise le retour de FedaPay
export const verifierPaiementCommande = async (req, res) => {
  try {
    const commandes = await prisma.marketplaceCommande.findMany({
      where: { fedapayTransactionId: String(req.params.id), acheteurId: req.user.id },
      select: { id: true, statut: true },
    });
    if (!commandes.length) return res.status(404).json({ message: 'Transaction Marketplace introuvable' });

    if (commandes.some((c) => c.statut === 'paiement_en_attente') && process.env.FEDAPAY_SECRET_KEY) {
      const transaction = await Transaction.retrieve(Number(req.params.id));
      await appliquerStatutTransactionMarketplace(String(req.params.id), transaction.status);
    }
    const resultats = await prisma.marketplaceCommande.findMany({
      where: { fedapayTransactionId: String(req.params.id), acheteurId: req.user.id },
      select: { id: true, statut: true },
    });
    res.json({ commandes: resultats });
  } catch {
    res.status(500).json({ message: 'Impossible de vérifier le paiement Marketplace' });
  }
};

export async function traiterWebhookMarketplace(transactionId, eventName) {
  const status = eventName === 'transaction.approved' ? 'approved'
    : eventName === 'transaction.declined' ? 'declined'
      : eventName === 'transaction.canceled' ? 'canceled' : null;
  if (!status) return false;
  const result = await prisma.marketplaceCommande.findFirst({
    where: { fedapayTransactionId: String(transactionId) },
    select: { id: true },
  });
  if (!result) return false;
  await appliquerStatutTransactionMarketplace(String(transactionId), status);
  return true;
}
