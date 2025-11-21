// /routes/authRoutes.js
import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { registerUser, loginUser, resetPassword, changePasswor, updteProfile, getUserprofile } from '../controllers/authController.js';
import { advanceMysqlQuery, createPost, getUserRole, inlineUpdateController, runSelect } from '../controllers/controller.js';
import { getAllTasks, getTasksForUser, handleCreateTask } from '../controllers/taskController.js';
import isAdmin from '../middleware/isAdmin.js';
import redirectIfAuthenticated from '../middleware/redirectIfAuthenticated.js';
import taskListRoutes from './taskList.routes.js';
import userTaskAssignmentRoutes from "./userTaskAssignment.routes.js";
import assignmentRoutes from "./assignment.routes.js";
import dailyTaskRoutes from "./dailytasks.routes.js";

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
router.use('/auth/tasklist', isAdmin, taskListRoutes);
router.use("/auth/tasklist/assignments", isAdmin, userTaskAssignmentRoutes);
router.use("/auth/assignments", isAdmin, assignmentRoutes);
router.use("/auth/daily/tasks", dailyTaskRoutes);

router.get('/403', (req, res) => res.render('403', { title: 'Access Restricted' }))
router.get('/auth/dashboard', (req, res) => res.render('dashboard', { title: 'Dashboard', user: req.user }));
router.get('/auth/settings', isAdmin, (req, res) => res.render('settings', { title: 'Settings', user: req.user }));
router.get('/auth/posts', (req, res) => res.render('posts', { title: 'Posts', user: req.user }));

router.get('/auth/userrole', getUserRole);
router.get('/auth/tasks/gellalltaks', getAllTasks);
// GET /tasks?status=pending&assigned_to=2&includeArchived=false
router.get('/auth/tasks/view', getTasksForUser);
router.get('/auth/user/profile', getUserprofile);

router.post('/auth/query/select', runSelect);
router.post('/auth/advance/query', advanceMysqlQuery);
router.post('/auth/create/task', handleCreateTask);
router.post('/auth/password/reset', resetPassword);
router.post('/auth/password/change', changePasswor);
router.post('/auth/update/profile', updteProfile);
router.post('/auth/create/post', createPost);

router.patch('/auth/inline/edit', inlineUpdateController);

// Task templates (CRUD)




export default router;