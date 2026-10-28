import { Router } from 'express';
import { verifierToken, verifierAdmin } from '../middlewares/auth.middleware.js';
import { verifierAccesFormation } from '../middlewares/formation-access.middleware.js';
import {
  getFormations, getFormation, createFormation, updateFormation, deleteFormation,
  getProjetsBriefs, getAdminProjetsBriefs, createProjetBrief, updateProjetBrief, deleteProjetBrief,
} from '../controllers/formation.controller.js';
import {
  generateQuizFinal, saveQuizFinal, getQuizFinal, getQuizFinalAdmin,
  getQuizFinalStatus, soumettreQuizFinal,
} from '../controllers/formationquiz.controller.js';

const router = Router();

// Static admin routes MUST come before /:id to avoid param capture
router.get('/admin/projets-briefs', verifierToken, verifierAdmin, getAdminProjetsBriefs);
router.post('/admin/projets-briefs', verifierToken, verifierAdmin, createProjetBrief);
router.put('/admin/projets-briefs/:id', verifierToken, verifierAdmin, updateProjetBrief);
router.delete('/admin/projets-briefs/:id', verifierToken, verifierAdmin, deleteProjetBrief);

router.get('/', getFormations);
router.post('/', verifierToken, verifierAdmin, createFormation);
router.get('/:id', getFormation);
router.put('/:id', verifierToken, verifierAdmin, updateFormation);
router.delete('/:id', verifierToken, verifierAdmin, deleteFormation);
router.get('/:id/projets-briefs', verifierToken, getProjetsBriefs);

// Quiz de fin de formation
router.post('/:id/quiz-final/generate', verifierToken, verifierAdmin, generateQuizFinal);
router.post('/:id/quiz-final', verifierToken, verifierAdmin, saveQuizFinal);
router.get('/:id/quiz-final/admin', verifierToken, verifierAdmin, getQuizFinalAdmin);
router.get('/:id/quiz-final/status', verifierToken, verifierAccesFormation('formation', 'id'), getQuizFinalStatus);
router.get('/:id/quiz-final', verifierToken, verifierAccesFormation('formation', 'id'), getQuizFinal);
router.post('/:id/quiz-final/soumettre', verifierToken, verifierAccesFormation('formation', 'id'), soumettreQuizFinal);

export default router;
