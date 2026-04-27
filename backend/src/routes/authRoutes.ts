import { Router } from 'express';
import { login, me, changePassword } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

export const authRoutes: Router = Router();

authRoutes.post('/login', login);
authRoutes.get('/me', requireAuth, me);
authRoutes.post('/change-password', requireAuth, changePassword);
