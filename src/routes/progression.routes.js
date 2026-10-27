import { Router } from 'express';
import { verifierToken } from '../middlewares/auth.middleware.js';
import { verifierAbonnement } from '../middlewares/abonnement.middleware.js';
import {
  terminerLecon, getModuleProgression, getProgression, updateProgression, getProgressionCalculee,
  getFormationProgressionLecons,
} from '../controllers/progression.controller.js';

const router = Router();

router.get('/formations/:id/progression-lecons', verifierToken, getFormationProgressionLecons);

router.post('/lecons/:id/terminer', verifierToken, verifierAbonnement, terminerLecon);
router.get('/modules/:id/progression', verifierToken, getModuleProgression);
router.get('/progression', verifierToken, getProgression);
router.post('/progression', verifierToken, updateProgression);
router.get('/formations/:id/progression-calculee', verifierToken, getProgressionCalculee);

export default router;
