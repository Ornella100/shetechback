import { Router } from 'express';
import { verifierToken, verifierAdmin, verifierMentorOuAdmin } from '../middlewares/auth.middleware.js';
import {
  mesDemandesMentorat, demanderSuiviMentorat, demandesMentoratAdmin, attribuerMentor,
  demandesMentoratMentor, modifierDemandeMentoratMentor,
} from '../controllers/demande-mentorat.controller.js';

const router = Router();

router.get('/mentorat/mes-demandes', verifierToken, mesDemandesMentorat);
router.post('/mentorat/mes-demandes', verifierToken, demanderSuiviMentorat);
router.get('/admin/mentorat/demandes', verifierToken, verifierAdmin, demandesMentoratAdmin);
router.put('/admin/mentorat/demandes/:id', verifierToken, verifierAdmin, attribuerMentor);
router.get('/mentor/mentorat/demandes', verifierToken, verifierMentorOuAdmin, demandesMentoratMentor);
router.put('/mentor/mentorat/demandes/:id', verifierToken, verifierMentorOuAdmin, modifierDemandeMentoratMentor);

export default router;
