import { Router } from 'express';
import { verifierToken, verifierAdmin } from '../middlewares/auth.middleware.js';
import {
  verifierEligibilite, genererCertificatFormation,
  verifierEligibiliteParcours, genererCertificatParcours,
  mesCertificats, downloadCertificat, supprimerCertificat,
} from '../controllers/certificat.controller.js';

const router = Router();

router.get('/certificats', verifierToken, mesCertificats);
router.get('/certificats/:id/download', verifierToken, downloadCertificat);
router.delete('/certificats/:id', verifierToken, verifierAdmin, supprimerCertificat);

router.get('/formations/:id/certificat/verifier', verifierToken, verifierEligibilite);
router.post('/formations/:id/certificat/generer', verifierToken, genererCertificatFormation);

router.get('/parcours/:id/certificat/verifier', verifierToken, verifierEligibiliteParcours);
router.post('/parcours/:id/certificat/generer', verifierToken, genererCertificatParcours);

export default router;
