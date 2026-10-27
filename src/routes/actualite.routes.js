import { Router } from 'express';
import { verifierToken, verifierAdmin } from '../middlewares/auth.middleware.js';
import {
  getActualitesPubliees, getActualitePubliee, getActualitesAdmin,
  creerActualite, modifierActualite, supprimerActualite,
} from '../controllers/actualite.controller.js';

const router = Router();

router.get('/actualites', getActualitesPubliees);
router.get('/actualites/:id', getActualitePubliee);
router.get('/admin/actualites', verifierToken, verifierAdmin, getActualitesAdmin);
router.post('/admin/actualites', verifierToken, verifierAdmin, creerActualite);
router.put('/admin/actualites/:id', verifierToken, verifierAdmin, modifierActualite);
router.delete('/admin/actualites/:id', verifierToken, verifierAdmin, supprimerActualite);

export default router;
