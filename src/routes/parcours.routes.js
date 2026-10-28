import { Router } from 'express';
import { verifierToken, verifierAdmin } from '../middlewares/auth.middleware.js';
import { verifierAccesParcours } from '../middlewares/formation-access.middleware.js';
import {
  getParcours, getParcoursDetail,
  createParcours, updateParcours, deleteParcours,
  reordonnerFormations,
} from '../controllers/parcours.controller.js';
import {
  mesInscriptions, inscrireParcours, desinscrireParcours,
} from '../controllers/userparcours.controller.js';
import {
  generateQuizParcours, saveQuizParcours, getQuizParcoursAdmin,
  getQuizParcours, getQuizParcoursStatus, soumettreQuizParcours,
} from '../controllers/parcoursquiz.controller.js';

const router = Router();

router.get('/', getParcours);
router.post('/', verifierToken, verifierAdmin, createParcours);

// ⚠️ Routes statiques AVANT /:id sinon Express capture "mes-inscriptions" comme un id
router.get('/mes-inscriptions', verifierToken, mesInscriptions);

router.get('/:id', verifierToken, getParcoursDetail);
router.put('/:id', verifierToken, verifierAdmin, updateParcours);
router.delete('/:id', verifierToken, verifierAdmin, deleteParcours);

router.put('/:id/formations/ordre', verifierToken, verifierAdmin, reordonnerFormations);

// Inscription aux parcours (max 3 actifs, appliqué en contrôleur)
router.post('/:id/inscription', verifierToken, inscrireParcours);
router.delete('/:id/inscription', verifierToken, desinscrireParcours);

// Quiz final du parcours (100 % requis pour le Grand Certificat)
router.post('/:id/quiz-final/generate', verifierToken, verifierAdmin, generateQuizParcours);
router.post('/:id/quiz-final', verifierToken, verifierAdmin, saveQuizParcours);
router.get('/:id/quiz-final/admin', verifierToken, verifierAdmin, getQuizParcoursAdmin);
router.get('/:id/quiz-final/status', verifierToken, verifierAccesParcours('id'), getQuizParcoursStatus);
router.get('/:id/quiz-final', verifierToken, verifierAccesParcours('id'), getQuizParcours);
router.post('/:id/quiz-final/soumettre', verifierToken, verifierAccesParcours('id'), soumettreQuizParcours);

export default router;
