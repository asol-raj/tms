// /routes/authRoutes.js
import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { registerUser, loginUser, resetPassword, changePasswor, updteProfile, getUserprofile } from '../controllers/authController.js';
import { advanceMysqlQuery, createPost, getUserRole, inlineUpdateController, runSelect } from '../controllers/controller.js';
// import { handleCreateTask } from '../controllers/task.controller.js';
import { getAllTasks, getTasksForUser, handleCreateTask } from '../controllers/taskController.js';
import isAdmin from '../middleware/isAdmin.js';
import redirectIfAuthenticated from '../middleware/redirectIfAuthenticated.js';
import * as ctrl from '../controllers/dailyTasks.controller.js';


const router = express.Router();

router.get('/', (req, res) => res.render('index', { title: 'TMS' }));
router.get('/login', redirectIfAuthenticated, (req, res) => res.render('login', { title: 'Login' }));
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
router.get('/403', (req, res) => res.render('403', { title: 'Access Restricted' }))
router.get('/auth/dashboard', (req, res) => res.render('dashboard', { title: 'Dashboard', user: req.user }));
router.get('/auth/settings', isAdmin, (req, res) => res.render('settings', { title: 'Settings', user: req.user }));
router.get('/auth/posts', (req, res) => res.render('posts', { title: 'Posts', user: req.user }));
router.get('/auth/daily/tasks', (req, res) => res.render('dailytasks', { title: 'Daily Tasks', user: req.user }));

router.get('/auth/userrole', getUserRole);
router.get('/auth/tasks/gellalltaks', getAllTasks);
// GET /tasks?status=pending&assigned_to=2&includeArchived=false
router.get('/auth/tasks/view', getTasksForUser);
router.get('/auth/user/profile', getUserprofile);


router.post('/auth/query/select', runSelect);
router.post('/auth/advance/query', advanceMysqlQuery);

router.post('/auth/create/task', handleCreateTask);
router.patch('/auth/inline/edit', inlineUpdateController);

router.post('/auth/password/reset', resetPassword);
router.post('/auth/password/change', changePasswor);
router.post('/auth/update/profile', updteProfile);

router.post('/auth/create/post', createPost);


// Task templates (CRUD)
router.get('/auth/daily/tasks/:id', ctrl.getTask);
router.get('/auth/daily/tasks/today', ctrl.getTodayTasks); // ?date=YYYY-MM-DD optional
router.get('/auth/daily/tasks/user/all', ctrl.listDailyTasksForAllUsers);
router.get('/auth/daily/tasks/user/:user_id', ctrl.listTasksForUser);

router.post('/auth/daily/tasks', ctrl.createTask);
router.put('/auth/daily/tasks/:id', ctrl.updateTask);
router.delete('/auth/daily/tasks/:id', ctrl.deleteTask);

// completions
router.post('/auth/daily/tasks/:id/complete', ctrl.completeTask);
router.post('/auth/daily/tasks/:id/undo_complete', ctrl.undoComplete);

export default router;