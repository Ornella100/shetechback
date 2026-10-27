import { Router } from 'express';
import { verifierToken } from '../middlewares/auth.middleware.js';
import {
  getCommunityPostSimple, createPost,
  getResponses, createResponse, markSolution,
  vote, getCommunityUsers, getUserProfile, updateCommunityProfile,
  follow, unfollow,
} from '../controllers/community.controller.js';

const router = Router();

router.get('/community/posts', verifierToken, getCommunityPostSimple);
router.post('/community/posts', verifierToken, createPost);
router.get('/community/posts/:id/responses', verifierToken, getResponses);
router.post('/community/posts/:id/responses', verifierToken, createResponse);
router.put('/community/responses/:id/solution', verifierToken, markSolution);
router.post('/community/vote', verifierToken, vote);

router.get('/community/users', verifierToken, getCommunityUsers);
router.get('/community/users/:id', verifierToken, getUserProfile);
router.put('/community/profil', verifierToken, updateCommunityProfile);
router.post('/community/users/:id/follow', verifierToken, follow);
router.delete('/community/users/:id/follow', verifierToken, unfollow);

export default router;
