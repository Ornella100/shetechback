import { Router } from 'express';
import { verifierToken } from '../middlewares/auth.middleware.js';
import { verifierAccesFormation } from '../middlewares/formation-access.middleware.js';
import {
  terminerLecon, getModuleProgression, getProgression, updateProgression, getProgressionCalculee,
  getFormationProgressionLecons,
} from '../controllers/progression.controller.js';

const router = Router();

router.get('/formations/:id/progression-lecons', verifierToken, getFormationProgressionLecons);

router.post('/lecons/:id/terminer', verifierToken, verifierAccesFormation('lecon', 'id'), terminerLecon);
router.get('/modules/:id/progression', verifierToken, verifierAccesFormation('module', 'id'), getModuleProgression);
router.get('/progression', verifierToken, getProgression);
router.post('/progression', verifierToken, verifierAccesFormation('formation', 'formation_id', { source: 'body' }), updateProgression);
router.get('/formations/:id/progression-calculee', verifierToken, verifierAccesFormation('formation', 'id'), getProgressionCalculee);

export default router;
