// /routes/authRoutes.js
import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { registerUser, loginUser } from '../controllers/authController.js';
import { advanceMysqlQuery, runSelect } from '../controllers/controller.js';

const router = express.Router();

router.get('/', (req, res) => res.render('index', { title: 'TMS' }));
router.get('/login', (req, res) => res.render('login', { title: 'Login' }));
router.get('/admin/register', (req, res) => res.render('register', { title: 'Register' }));


// These routes MUST be public.
router.post('/login', loginUser);
router.post('/register', registerUser);

// Logout route
router.get('/logout', (req, res) => {
    // Clear the cookie that holds the token
    res.clearCookie('tms_token', {
        httpOnly: true,
        sameSite: 'lax'
    });

    // Redirect user back to login page
    return res.redirect('/login');
});

router.use('/auth', authMiddleware);
router.get('/auth/dashboard', (req, res) => res.render('dashboard', { title: 'Dashboard', user: req.user }));

router.post('/auth/query/select', runSelect);
router.post('/auth/advance/query', advanceMysqlQuery);



export default router;