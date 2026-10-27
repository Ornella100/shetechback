import { Router } from 'express';
import express from 'express';
import { verifierToken, verifierAdmin } from '../middlewares/auth.middleware.js';
import {
  getStatut, creerCheckout, mesPaiements, listeAbonnementsAdmin,
  webhookFedapay, verifierTransaction,
} from '../controllers/abonnement.controller.js';

const router = Router();

router.get('/abonnement/statut', verifierToken, getStatut);
router.post('/abonnement/checkout', verifierToken, creerCheckout);
router.get('/abonnement/paiements', verifierToken, mesPaiements);
router.get('/abonnement/verifier-transaction/:id', verifierToken, verifierTransaction);

router.get('/admin/abonnements', verifierToken, verifierAdmin, listeAbonnementsAdmin);

// Corps BRUT obligatoire : la signature FedaPay est calculée sur les octets exacts.
// Cette route est déclarée avec express.raw AVANT que express.json ne s'applique.
router.post('/webhooks/fedapay', express.raw({ type: '*/*' }), webhookFedapay);

export default router;
