// /routes/authRoutes.js
import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { registerUser, loginUser } from '../controllers/authController.js';

const router = express.Router();

router.get('/', (req, res) => res.render('index', { title: 'TMS' }));
router.get('/login', (req, res) => res.render('login', { title: 'Login' }));
router.get('/admin/register', (req, res) => res.render('register', { title: 'Register' }));


// These routes MUST be public.
router.post('/login', loginUser);
router.post('/register', registerUser);

router.use('/auth', authMiddleware);

router.get('/auth/dashboard', (req, res)=>res.render('dashboard', { title: 'Dashboard' }));

export default router;