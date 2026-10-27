import { Router } from 'express';
import * as coursController from '../controllers/cours.controller.js';
import { verifierToken, verifierAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/modules/:moduleId/cours', coursController.getCours);
router.get('/cours/:id', coursController.getCoursDetail);

router.post('/cours', verifierToken, verifierAdmin, coursController.createCours);
router.put('/cours/:id', verifierToken, verifierAdmin, coursController.updateCours);
router.delete('/cours/:id', verifierToken, verifierAdmin, coursController.deleteCours);

export default router;
