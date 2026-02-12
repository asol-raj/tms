// src/controllers/attendanceController.js
import * as model from '../models/attendanceModel.js';

function sendError(res, err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
}

// POST /api/attendance/checkin
export async function checkIn(req, res) {
    try {
        // If admin is marking attendance → use req.body.user_id
        // If normal user is marking own attendance → use req.user.user_id
        const targetUserId = req.body.user_id || req.user.user_id;

        if (!targetUserId) {
            return res.status(400).json({ error: "User ID missing" });
        }

        // before upsertCheckIn
        const todayStatus = await model.getAttendanceForDate(today);
        if (['holiday', 'weekoff'].includes(todayStatus)) {
            return res.status(400).json({ error: 'Check-in not allowed on weekoff/holiday' });
        }

        await model.upsertCheckIn(targetUserId);

        return res.json({
            ok: true,
            message: "Checked in",
            marked_for: targetUserId
        });

    } catch (err) {
        return sendError(res, err);
    }
}


// POST /api/attendance/checkout
export async function checkOut(req, res) {
    try {
        const { user_id } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id required' });

        const result = await model.setCheckOut(user_id);
        // If no rows affected, maybe no record for today
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No attendance record for today to check out' });
        }
        return res.json({ ok: true, message: 'Checked out' });
    } catch (err) {
        return sendError(res, err);
    }
}

// POST /api/attendance/mark  -> { user_id, date, status, note }
export async function markStatus(req, res) {
    try {
        const { user_id, date, status, note } = req.body;
        if (!user_id || !date || !status) return res.status(400).json({ error: 'user_id, date and status required' });

        const allowed = ['present', 'absent', 'leave', 'holiday', 'weekoff'];
        if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });

        await model.markStatusForDate(user_id, date, status, note ?? null);
        return res.json({ ok: true, message: 'Status saved' });
    } catch (err) {
        return sendError(res, err);
    }
}

// GET /api/attendance/today
export async function todayAttendance(req, res) {
    try {
        const date = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD' (UTC)
        const rows = await model.getAttendanceForDate(date);
        return res.json({ date, rows });
    } catch (err) {
        return sendError(res, err);
    }
}

// GET /api/attendance/date?date=YYYY-MM-DD
export async function attendanceByDate(req, res) {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });

        const rows = await model.getAttendanceForDate(date);
        return res.json({ date, rows });
    } catch (err) {
        return sendError(res, err);
    }
}

// GET /api/attendance/range?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function attendanceRange(req, res) {
    try {
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ error: 'from and to query params required (YYYY-MM-DD)' });

        const rows = await model.getAttendanceRange(from, to);
        return res.json({ from, to, rows });
    } catch (err) {
        return sendError(res, err);
    }
}

// GET /api/attendance/stats/today
export async function todayStats(req, res) {
    try {
        const date = new Date().toISOString().slice(0, 10);
        const present = await model.getPresentCount(date);
        const total = await model.getAllUsersCount();
        const absent_estimate = total - present;
        return res.json({ date, total, present, absent_estimate });
    } catch (err) {
        return sendError(res, err);
    }
}

// GET /api/attendance/month?month=YYYY-MM
export async function attendanceByMonth(req, res) {
    try {
        const { month } = req.query;
        if (!month) {
            return res.status(400).json({ error: 'month required (YYYY-MM)' });
        }

        const rows = await model.getAttendanceForMonth(month);

        // Transform to { user_id: { day: status } }
        const data = {};
        rows.forEach(r => {
            if (!data[r.user_id]) data[r.user_id] = {};
            if (r.day) data[r.user_id][r.day] = r.status;
        });

        return res.json({ month, data });
    } catch (err) {
        return sendError(res, err);
    }
}

export async function attendanceUsers(req, res){
    try {
        let data = await model.allUsers();
        return res.json({ data });
    } catch (error) {
        return sendError(res, err);
    }
}
