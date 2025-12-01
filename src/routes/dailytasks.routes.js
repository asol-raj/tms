import express from "express";
const router = express.Router();
import * as ctrl from '../controllers/dailyTasks.controller.js';
const log = console.log;
// all routes start here with /auth/daily/tasks

// router.use((req, res, next)=>{
//     log(req.baseUrl, req.host, req.hostname,);
//     next();
// })

router.get('/', (req, res) => res.render('dailytasks', { title: 'Daily Tasks', user: req.user }));
router.get('/data', ctrl.getAllTasks);

router.get('/:id', ctrl.getTask);
router.post('/:id/complete', ctrl.completeTask);
router.post('/:id/undo_complete', ctrl.undoComplete);

router.post('/:id/remarks', ctrl.saveTaskRemarks);

router.get('/today', ctrl.getTodayTasks); // ?date=YYYY-MM-DD optional
router.get('/user/all', ctrl.listDailyTasksForAllUsers);
router.get('/user/:user_id', ctrl.listTasksForUser);
router.post('/month/report', ctrl.viewMonthReport);


// completions

router.get('/date/:date', ctrl.getTasksByDate);   // ?user_id= (optional, admin can pass to view other users)
router.get('/date/:date/all', ctrl.listTasksByDateForAllUsers); // admin - all users for that date

// keep existing today route (it will now use the unified model underneath)
router.get('/today', ctrl.getTodayTasks);



export default router;