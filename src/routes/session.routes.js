import { Router } from 'express';
import { verifierToken, verifierAdmin, verifierMentorOuAdmin } from '../middlewares/auth.middleware.js';
import {
  getMentors, getSessions, createSession, reserverSession,
  getMentorSessions, updateMentorSession, annulerMaSession,
  getAdminSessions, createAdminSession, updateAdminSession, deleteAdminSession,
} from '../controllers/session.controller.js';

const router = Router();

router.get('/mentors', verifierToken, getMentors);
router.get('/sessions', verifierToken, getSessions);
router.post('/sessions', verifierToken, createSession);
router.post('/sessions/reserver', verifierToken, reserverSession);
router.put('/sessions/:id/annuler', verifierToken, annulerMaSession);
router.get('/mentor/sessions', verifierToken, verifierMentorOuAdmin, getMentorSessions);
router.put('/mentor/sessions/:id', verifierToken, verifierMentorOuAdmin, updateMentorSession);

router.get('/admin/sessions', verifierToken, verifierAdmin, getAdminSessions);
router.post('/admin/sessions', verifierToken, verifierAdmin, createAdminSession);
router.put('/admin/sessions/:id', verifierToken, verifierAdmin, updateAdminSession);
router.delete('/admin/sessions/:id', verifierToken, verifierAdmin, deleteAdminSession);

export default router;
