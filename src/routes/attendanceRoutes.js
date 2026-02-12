// src/routes/attendanceRoutes.js
import express from 'express';
import * as ctrl from '../controllers/attendanceController.js';

const router = express.Router();

// Public or authenticated endpoints (you can add auth middleware where needed)
router.get('/', (req, res)=> res.render('attendance', { title: 'User Attendance', user: req.user }))
router.post('/checkin', ctrl.checkIn);            // body: { user_id }
router.post('/checkout', ctrl.checkOut);          // body: { user_id }
router.post('/mark', ctrl.markStatus);            // body: { user_id, date, status, note? }

router.get('/today', ctrl.todayAttendance);       // returns all users with today's status
router.get('/date', ctrl.attendanceByDate);       // ?date=YYYY-MM-DD
router.get('/range', ctrl.attendanceRange);       // ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/stats/today', ctrl.todayStats);      // quick counts
router.get('/month', ctrl.attendanceByMonth);
router.get('/api/users', ctrl.attendanceUsers);


export default router;
