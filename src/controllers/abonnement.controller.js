import prisma from '../lib/prisma.js';
import { Transaction, Webhook } from '../lib/fedapay.js';
import { getStatutAcces } from '../lib/abonnement.js';
import { traiterWebhookMarketplace } from './marketplace.controller.js';

const PRIX_XOF = () => Number(process.env.PRIX_PACK_PARCOURS_XOF || 150000);

// GET /abonnement/statut (token)
export const getStatut = async (req, res) => {
  try {
    const statut = await getStatutAcces(req.user.id);
    res.json({ ...statut, prix_xof: PRIX_XOF() });
  } catch (err) {
    console.error('Erreur statut abonnement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /abonnement/checkout (token) — achat unique donnant accès à trois parcours
export const creerCheckout = async (req, res) => {
  try {
    if (!process.env.FEDAPAY_SECRET_KEY)
      return res.status(503).json({ message: 'Le paiement en ligne n\'est pas encore configuré. Contactez l\'équipe SheTech.' });

    const access = await getStatutAcces(req.user.id);
    if (access.acces && access.type !== 'test' && access.type !== 'staff') {
      return res.status(409).json({ message: 'Votre accès au pack de trois parcours est déjà actif.' });
    }
    if (access.type === 'test' || access.type === 'staff') {
      return res.status(409).json({ message: 'Ce compte dispose déjà d’un accès de test ou d’équipe.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { nom: true, email: true },
    });
    if (!user) return res.status(404).json({ message: 'Utilisatrice introuvable' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const transaction = await Transaction.create({
      description: 'Pack SheTech — accès à trois parcours',
      amount: PRIX_XOF(),
      currency: { iso: 'XOF' },
      callback_url: `${frontendUrl}/dashboard/abonnement?retour=1`,
      customer: {
        firstname: user.nom.split(' ')[0] || user.nom,
        lastname: user.nom.split(' ').slice(1).join(' ') || user.nom,
        email: user.email,
      },
    });

    await prisma.paiement.create({
      data: {
        userId: req.user.id,
        fedapayTransactionId: String(transaction.id),
        reference: transaction.reference || null,
        montant: PRIX_XOF(),
        devise: 'XOF',
        statut: 'pending',
      },
    });

    const token = await transaction.generateToken();
    res.json({ url: token.url, transaction_id: transaction.id });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la création du paiement', detail: err.message });
  }
};

// GET /abonnement/paiements (token) — historique personnel
export const mesPaiements = async (req, res) => {
  try {
    const paiements = await prisma.paiement.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, montant: true, devise: true, statut: true, methode: true,
        reference: true, createdAt: true,
        abonnement: { select: { dateDebut: true, dateFin: true, statut: true } },
      },
    });
    res.json(paiements);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /admin/abonnements (token + admin) — traçabilité des achats
export const listeAbonnementsAdmin = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'apprenante' },
      select: {
        id: true, nom: true, email: true, createdAt: true,
        abonnements: {
          orderBy: { dateFin: 'desc' },
          select: { id: true, statut: true, dateDebut: true, dateFin: true, source: true },
        },
        paiements: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, montant: true, devise: true, statut: true, methode: true, reference: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users.map(u => ({
      ...u,
      acces: u.abonnements.some(a => a.statut === 'active' && (!a.dateFin || a.dateFin > new Date()))
        || process.env.TEST_ACCESS_EMAIL?.trim().toLowerCase() === u.email.toLowerCase(),
    })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Enregistre l'accès permanent obtenu par le paiement approuvé.
async function activerAchat(paiement) {
  const dejaActif = await prisma.abonnement.findUnique({ where: { paiementId: paiement.id } });
  if (dejaActif) return;
  const now = new Date();
  await prisma.abonnement.create({
    data: {
      userId: paiement.userId,
      statut: 'active',
      dateDebut: now,
      dateFin: null,
      source: 'achat_pack_3_parcours',
      paiementId: paiement.id,
    },
  });
}

// POST /webhooks/fedapay (public, corps BRUT requis pour la signature)
export const webhookFedapay = async (req, res) => {
  let event;
  try {
    const signature = req.headers['x-fedapay-signature'];
    const secret = process.env.FEDAPAY_WEBHOOK_SECRET;
    if (secret) {
      event = Webhook.constructEvent(req.body.toString('utf8'), signature, secret);
    } else {
      // Pas de secret configuré (dev) : on lit le corps sans vérification
      event = JSON.parse(req.body.toString('utf8'));
    }
  } catch (err) {
    return res.status(400).json({ message: `Signature invalide: ${err.message}` });
  }

  try {
    const nom = event.name || event.type;
    const entity = event.entity || event.data || {};
    const transactionId = String(entity.id ?? '');
    if (!transactionId) return res.status(200).json({ received: true });

    const paiement = await prisma.paiement.findUnique({
      where: { fedapayTransactionId: transactionId },
    });
    if (!paiement) {
      await traiterWebhookMarketplace(transactionId, nom);
      return res.status(200).json({ received: true });
    }

    if (nom === 'transaction.approved') {
      // Idempotent : un webhook rejoué ne crée pas de second accès
      if (paiement.statut !== 'approved') {
        await prisma.paiement.update({
          where: { id: paiement.id },
          data: {
            statut: 'approved',
            methode: entity.mode || null,
            reference: entity.reference || paiement.reference,
            payloadWebhook: entity,
          },
        });
        await activerAchat(paiement);
      }
    } else if (nom === 'transaction.declined' || nom === 'transaction.canceled') {
      if (paiement.statut === 'pending') {
        await prisma.paiement.update({
          where: { id: paiement.id },
          data: { statut: nom === 'transaction.declined' ? 'declined' : 'canceled', payloadWebhook: entity },
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    // On répond 200 pour éviter les rafales de retentatives ; l'erreur est loguée côté serveur
    console.error('Erreur webhook FedaPay:', err);
    res.status(200).json({ received: true });
  }
};

// GET /abonnement/verifier-transaction/:id (token) — filet de sécurité au retour du checkout
// (le webhook peut ne pas être joignable en local) : interroge FedaPay directement.
export const verifierTransaction = async (req, res) => {
  try {
    const paiement = await prisma.paiement.findFirst({
      where: { fedapayTransactionId: String(req.params.id), userId: req.user.id },
    });
    if (!paiement) return res.status(404).json({ message: 'Paiement introuvable' });

    if (paiement.statut === 'pending' && process.env.FEDAPAY_SECRET_KEY) {
      const transaction = await Transaction.retrieve(Number(req.params.id));
      if (transaction.status === 'approved') {
        await prisma.paiement.update({
          where: { id: paiement.id },
          data: { statut: 'approved', methode: transaction.mode || null },
        });
        await activerAchat(paiement);
      } else if (['declined', 'canceled'].includes(transaction.status)) {
        await prisma.paiement.update({
          where: { id: paiement.id },
          data: { statut: transaction.status },
        });
      }
    }

    const statut = await getStatutAcces(req.user.id);
    res.json({ ...statut, prix_xof: PRIX_XOF() });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', detail: err.message });
  }
};
