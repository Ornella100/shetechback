import { Router } from 'express';
import { verifierToken } from '../middlewares/auth.middleware.js';
import { getConversations, getMessagesAvec, envoyerMessageDirect } from '../controllers/message.controller.js';

const router = Router();

router.get('/messages/conversations', verifierToken, getConversations);
router.get('/messages/conversations/:userId', verifierToken, getMessagesAvec);
router.post('/messages/conversations/:userId', verifierToken, envoyerMessageDirect);

export default router;
