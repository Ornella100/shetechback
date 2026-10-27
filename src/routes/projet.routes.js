import { Router } from 'express';
import { verifierToken, verifierTokenOptionnel, verifierAdmin, verifierMentorOuAdmin } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import {
  getProjets, getProjet, getProjetsPublics, getAdminProjets,
  createProjet, updateProjet, deleteProjet, assignerProjet,
  repondreProjet, partagerProjet,
  addCommentaire, toggleLike, evaluerProjet,
  getMessages, envoyerMessage,
  getLivrables, uploadLivrable, deleteLivrable,
} from '../controllers/projet.controller.js';

const router = Router();

router.get('/projets/publics', verifierTokenOptionnel, getProjetsPublics);
router.get('/projets', verifierToken, getProjets);
router.get('/projets/:id', verifierToken, getProjet);
router.post('/projets', verifierToken, createProjet);
router.put('/projets/:id', verifierToken, updateProjet);
router.delete('/projets/:id', verifierToken, deleteProjet);

// Réponse de l'apprenante à un projet assigné + partage communauté d'un projet personnel
router.put('/projets/:id/reponse', verifierToken, repondreProjet);
router.put('/projets/:id/partage', verifierToken, partagerProjet);

router.post('/projets/:id/commentaires', verifierToken, addCommentaire);
router.post('/projets/:id/like', verifierToken, toggleLike);
router.put('/projets/:id/evaluer', verifierToken, verifierMentorOuAdmin, evaluerProjet);

// Messagerie apprenante ↔ SheTech (projets assignés uniquement)
router.get('/projets/:id/messages', verifierToken, getMessages);
router.post('/projets/:id/messages', verifierToken, envoyerMessage);

router.get('/projets/:id/livrables', verifierToken, getLivrables);
router.post('/projets/:id/livrables', verifierToken, upload.single('fichier'), uploadLivrable);
router.delete('/livrables/:id', verifierToken, deleteLivrable);

router.get('/admin/projets', verifierToken, verifierAdmin, getAdminProjets);
router.post('/admin/projets/assigner', verifierToken, verifierMentorOuAdmin, assignerProjet);

export default router;
