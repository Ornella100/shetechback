import { Router } from 'express';
import { verifierToken, verifierAdmin } from '../middlewares/auth.middleware.js';
import {
  verifierEligibilite, genererCertificatFormation,
  verifierEligibiliteParcours, genererCertificatParcours,
  mesCertificats, downloadCertificat, supprimerCertificat,
  listeCertificatsAdmin, parcoursEligiblesAdmin, emettreCertificatParcoursAdmin, downloadCertificatAdmin,
} from '../controllers/certificat.controller.js';

const router = Router();

router.get('/certificats', verifierToken, mesCertificats);
router.get('/admin/certificats', verifierToken, verifierAdmin, listeCertificatsAdmin);
router.get('/admin/certificats/parcours/eligibles', verifierToken, verifierAdmin, parcoursEligiblesAdmin);
router.post('/admin/certificats/parcours', verifierToken, verifierAdmin, emettreCertificatParcoursAdmin);
router.get('/admin/certificats/:id/download', verifierToken, verifierAdmin, downloadCertificatAdmin);
router.get('/certificats/:id/download', verifierToken, downloadCertificat);
router.delete('/certificats/:id', verifierToken, verifierAdmin, supprimerCertificat);

router.get('/formations/:id/certificat/verifier', verifierToken, verifierEligibilite);
router.post('/formations/:id/certificat/generer', verifierToken, genererCertificatFormation);

router.get('/parcours/:id/certificat/verifier', verifierToken, verifierEligibiliteParcours);
router.post('/parcours/:id/certificat/generer', verifierToken, genererCertificatParcours);

export default router;
