// controllers/dailyTasks.controller.js
import { log, runMysql } from '../config/db.js';
import * as model from '../models/dailyTasks.model.js';
import UsersDailyTaskRemarksModel from "../models/usersDailyTaskRemarks.model.js";


// Helper: get weekday short string from date (JS Date or YYYY-MM-DD)
const weekdayShort = (d) => {
  const dt = (typeof d === 'string') ? new Date(d + 'T00:00:00') : d;
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dt.getDay()];
};

// GET /tasks/today?date=YYYY-MM-DD
// export const getTodayTasks = async (req, res) => {
//   try {
//     const user_id = req.user?.id || parseInt(req.query.user_id, 10);
//     if (!user_id) return res.status(400).json({ error: 'user_id required' });

//     const date = req.query.date || (new Date()).toISOString().slice(0,10); // YYYY-MM-DD
//     const w = weekdayShort(date);

//     const sql = `
//       SELECT udt.*,
//              CASE WHEN udc.id IS NOT NULL THEN 1 ELSE 0 END AS is_completed,
//              udc.completed_at, udc.remarks
//       FROM users_daily_tasks udt
//       LEFT JOIN users_daily_task_completions udc
//         ON udc.task_id = udt.id
//         AND udc.for_date = ?
//         AND udc.user_id = ?
//       WHERE udt.is_active = 1
//         AND udt.user_id = ?
//         AND (
//              udt.recurrence_type = 'daily'
//              OR (udt.recurrence_type = 'weekly' AND FIND_IN_SET(?, udt.recurrence_weekdays))
//              OR (udt.recurrence_type = 'once' AND udt.once_date = ?)
//         )
//       ORDER BY FIELD(udt.priority,'high','medium','low'), udt.id
//     `;
//     const [rows] = await model.pool.query(sql, [date, user_id, user_id, w, date]);
//     return res.json({ date, tasks: rows });
//   } catch (err) {
//     console.error('getTodayTasks err', err);
//     return res.status(500).json({ error: 'Internal error' });
//   }
// };

// POST /tasks  (create template)
export const createTask = async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.user_id || !payload.title) return res.status(400).json({ error: 'user_id and title required' });

    const task = await model.createTask({
      user_id: payload.user_id,
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
      assigned_by: payload.assigned_by,
      recurrence_type: payload.recurrence_type,
      recurrence_weekdays: payload?.recurrence_weekdays || null,
      once_date: payload?.once_date || null,
      is_active: typeof payload.is_active === 'undefined' ? 1 : payload.is_active
    });
    return res.status(201).json({ task });
  } catch (err) {
    console.error('createTask err', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};

// GET /tasks/:id
export const getTask = async (req, res) => {
  try {
    const id = req.params.id;
    const task = await model.getTaskById(id);
    if (!task) return res.status(404).json({ error: 'Not found' });
    return res.json({ task });
  } catch (err) {
    console.error('getTask err', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};

// PUT /tasks/:id
export const updateTask = async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const task = await model.updateTask(id, updates);
    return res.json({ task });
  } catch (err) {
    console.error('updateTask err', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};

// DELETE /tasks/:id
export const deleteTask = async (req, res) => {
  try {
    const id = req.params.id;
    const ok = await model.deleteTask(id);
    return res.json({ success: ok });
  } catch (err) {
    console.error('deleteTask err', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};

// GET /tasks/user/:user_id
export const listTasksForUser = async (req, res) => {
  try {
    const user_id = req.params.user_id;
    const rows = await model.listTasksForUser(user_id);
    return res.json({ tasks: rows });
  } catch (err) {
    console.error('listTasksForUser err', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};

export const listDailyTasksForAllUsers = async (req, res) => {
  try {
    const rows = await model.listDailyTasksForAllUsers(); //log(rows);
    return res.json({ tasks: rows });
  } catch (err) {
    console.error('listTasksForUser err', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};

/*
  completions
*/
// POST /tasks/:id/complete  body: { for_date, remarks, user_id (optional) }
export const completeTask = async (req, res) => {
  try {
    const task_list_id = req.params.id;
    const user_id = req.user?.id;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const for_date = req.body.for_date || (new Date()).toISOString().slice(0, 10);
    const remarks = req.body.remarks || null;

    const completion = await model.markComplete({ task_list_id, user_id, for_date, remarks });
    return res.json({ completion });
  } catch (err) {
    console.error('completeTask err', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};

// POST /tasks/:id/undo_complete  body: { for_date, user_id (optional) }
export const undoComplete = async (req, res) => {
  try {
    const task_list_id = req.params.id;
    const user_id = req.body.user_id || req.user?.id; log(user_id);
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const for_date = req.body.for_date || (new Date()).toISOString().slice(0, 10);
    const ok = await model.undoComplete({ task_list_id, user_id, for_date }); log(ok);
    return res.json({ success: ok });
  } catch (err) {
    console.error('undoComplete err', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};

// NEW: generalized handler for any date (was previously getTodayTasks)
export const getTodayTasks = async (req, res) => {
  try {
    const user_id = req.user?.id || parseInt(req.query.user_id, 10);
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const date = req.query.date || (new Date()).toISOString().slice(0, 10); // YYYY-MM-DD
    const w = weekdayShort(date);

    const tasks = await model.getTasksForDate({ user_id, for_date: date, weekday: w });
    return res.json({ date, tasks });
  } catch (err) {
    console.error('getTodayTasks err', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};

// NEW: GET /auth/daily/tasks/date/:date  (optional query user_id= for admin)
export const getTasksByDate = async (req, res) => {
  try {
    const date = req.params.date || req.query.date;
    if (!date) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });

    const user_id = req.query.user_id || req.user?.id;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const w = weekdayShort(date);
    const tasks = await model.getTasksForDate({ user_id, for_date: date, weekday: w });
    return res.json({ date, tasks });
  } catch (err) {
    console.error('getTasksByDate err', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};

// NEW: GET /auth/daily/tasks/date/:date/all  (admin view across users)
export const listTasksByDateForAllUsers = async (req, res) => {
  try {
    const date = req.params.date || req.query.date;
    if (!date) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });

    const w = weekdayShort(date);
    const tasks = await model.listTasksForDateForAllUsers({ for_date: date, weekday: w });
    return res.json({ date, tasks });
  } catch (err) {
    console.error('listTasksByDateForAllUsers err', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};


// Put this in your 'routes' or 'controllers' file
// Assume 'authMiddleware' is your middleware that adds 'req.user'
// and 'getTasks' is imported from your model file.

export const getAllTasks = async (req, res) => {
  try {
    const { user } = req; //log(user) // The authenticated user from your middleware

    // Get filters from query string (e.g., /api/tasks?date=2025-11-17&userId=5)
    const {
      user_id,         // Admin only: filter by a specific user
      date,           // Optional: 'YYYY-MM-DD'
      includeInactive = true // Admin only: 'true'
    } = req.query; //log('req.query', req.query);

    // --- 1. Build the options object for the model ---
    const options = {
      requestingUser: user, // Pass the authenticated user for security
    };

    // --- 2. Add Admin-Only Filters ---
    if (user.role === 'admin') {
      if (user_id) {
        options.userId = parseInt(user_id, 10);
      }
      if (includeInactive === 'true') {
        options.includeInactive = true;
      }
    }

    // --- 3. Add Date Filters ---
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      }

      options.forDate = date;

      // Auto-calculate weekday from the date
      // This is more robust than requiring the client to send it
      const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const d = new Date(date + 'T12:00:00'); // Use noon to avoid timezone/DST issues
      options.weekday = dayMap[d.getDay()];
    }
    // log(options);

    // --- 4. Call the unified model ---
    const tasks = await model.getTasks(options); //log(tasks);
    res.json({ tasks });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'An error occurred while fetching tasks.' });
  }
};

export const viewMonthReport_ = async (req, res) => {
  try {
    const { startOfMonth } = req.body;
    let  userId = req.body.userId; // req.body.userId ? Number(req.body.userId) : (req.user && req.user.id ? Number(req.user.id) : null);    
    if(req.user.role === 'user') {
      userId = req.user.id
    };

    if (!userId) return res.status(400).json({ error: 'userId required' });
    // drop-in SQL replacement for viewMonthReport (params: startOfMonth, startOfMonth, userId, userId)
    const sql = `
      WITH RECURSIVE dates AS (
        SELECT DATE(?) AS dt
        UNION ALL
        SELECT DATE_ADD(dt, INTERVAL 1 DAY) FROM dates
        WHERE dt < LAST_DAY(?)
      )
      SELECT
        tl.id AS task_id,
        tl.task_list_id,
        tl.title,
        DATE_FORMAT(d.dt, '%Y-%m-%d') AS for_date,
        CASE
  -- 1) not a scheduled occurrence on this date
  WHEN NOT (
    tl.recurrence_type = 'daily'
    OR (tl.recurrence_type = 'weekly' AND FIND_IN_SET(LOWER(DATE_FORMAT(d.dt, '%a')), tl.recurrence_weekdays))
    OR (tl.recurrence_type = 'once' AND tl.once_date = d.dt)
  ) THEN 'N/A'

  -- 2) future date (beyond today) => treat as N/A (user hasn't had a chance yet)
  WHEN d.dt > CURRENT_DATE() THEN 'N/A'

  -- 3) assignment not present/active for this user on this task OR assignment starts after this date => N/A
  WHEN (uta.id IS NULL)
      OR (uta.is_active = 0)
      OR (uta.start_date IS NOT NULL AND uta.start_date > d.dt)
      OR (uta.end_date IS NOT NULL AND uta.end_date < d.dt)
      OR (uta.assigned_at IS NOT NULL AND DATE(uta.assigned_at) > d.dt)
  THEN 'N/A'

  -- 4) scheduled & assignment active on this date, but no completion recorded
  --    ⬇⬇ CHANGE IS HERE ⬇⬇
  WHEN c.id IS NULL THEN NULL      -- or 'N/A' or 'Pending', as you prefer

  -- 5) completed but beyond 24 hours -> late
  WHEN TIMESTAMPDIFF(
        HOUR,
        CONCAT(d.dt, ' 00:00:00'),
        c.completed_at
      ) > 24
  THEN CONCAT(
        'Yes (',
        TIMESTAMPDIFF(
          HOUR,
          CONCAT(d.dt, ' 00:00:00'),
          c.completed_at
        ),
        ' hrs)'
      )

  -- 6) completed within 24 hours -> on time
  ELSE 'No'
END AS status,


        CASE WHEN c.id IS NULL THEN NULL
            ELSE TIMESTAMPDIFF(HOUR, CONCAT(d.dt, ' 00:00:00'), c.completed_at)
        END AS hours_late,

        CASE WHEN c.completed_at IS NULL THEN NULL ELSE DATE_FORMAT(c.completed_at, '%Y-%m-%d %T') END AS completed_at,
        c.remarks

      FROM tasks_list tl
      -- only tasks that have an active assignment for this user (inner join)
      INNER JOIN user_task_assignments uta
        ON uta.task_list_id = tl.id
        AND uta.user_id = ?
        AND uta.is_active = 1

      CROSS JOIN dates d

      LEFT JOIN users_daily_task_completions c
        ON c.task_list_id = tl.id
        AND c.user_id = ?
        AND c.for_date = d.dt
        AND c.is_active = 1

      WHERE tl.is_active = 1
      ORDER BY tl.id, d.dt;
      `;

    // params: startOfMonth, startOfMonth, userId, userId
    const params = [startOfMonth, startOfMonth, userId, userId];
    const rows = await runMysql(sql, params);

    // normalize depending on runMysql output
    const normalizedRows = (Array.isArray(rows) && rows.length && rows[0] && rows[0].task_id === undefined)
      ? (rows[0] || [])
      : rows || [];

    return res.json({ data: normalizedRows });
  } catch (error) {
    console.error('Error fetching month report:', error);
    return res.status(500).json({ error: 'An error occurred while fetching month report.' });
  }
};

export const viewMonthReport = async (req, res) => {
  try {
    // 1) Decide which month to show
    let year = req.query.year ? Number(req.query.year) : null;
    let month = req.query.month ? Number(req.query.month) : null; // 1–12

    const today = new Date();

    if (!year || isNaN(year)) {
      year = today.getFullYear();
    }

    if (!month || isNaN(month) || month < 1 || month > 12) {
      month = today.getMonth() + 1; // JS months are 0–11
    }

    // Build YYYY-MM-01 as startOfMonth
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;

    // 2) Resolve userId (same as before)
    let userId = req.body.userId;
    if (req.user.role === 'user') {
      userId = req.user.id;
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const sql = `
      WITH RECURSIVE dates AS (
        SELECT 
          DATE(?) AS dt 
        UNION ALL 
        SELECT 
          DATE_ADD(dt, INTERVAL 1 DAY) 
        FROM 
          dates 
        WHERE 
          dt < LAST_DAY(?)
      ) 
      SELECT 
        tl.id AS task_id, 
        tl.task_list_id, 
        tl.title, 
        DATE_FORMAT(d.dt, '%Y-%m-%d') AS for_date, 
        CASE -- 1) not a scheduled occurrence on this date
        WHEN NOT (
          tl.recurrence_type = 'daily' 
          OR (
            tl.recurrence_type = 'weekly' 
            AND FIND_IN_SET(
              LOWER(
                DATE_FORMAT(d.dt, '%a')
              ), 
              tl.recurrence_weekdays
            )
          ) 
          OR (
            tl.recurrence_type = 'once' 
            AND tl.once_date = d.dt
          )
        ) THEN 'N/A' -- 2) future date (beyond today) => treat as N/A (user hasn't had a chance yet)
        WHEN d.dt > CURRENT_DATE() THEN 'N/A' -- 3) assignment not present/active for this user on this task OR assignment starts after this date => N/A
        WHEN (uta.id IS NULL) 
        OR (uta.is_active = 0) 
        OR (
          uta.start_date IS NOT NULL 
          AND uta.start_date > d.dt
        ) 
        OR (
          uta.end_date IS NOT NULL 
          AND uta.end_date < d.dt
        ) 
        OR (
          uta.assigned_at IS NOT NULL 
          AND DATE(uta.assigned_at) > d.dt
        ) THEN 'N/A' -- 4) scheduled & assignment active on this date, but no completion recorded
        --    ⬇⬇ CHANGE IS HERE ⬇⬇
        WHEN c.id IS NULL THEN NULL -- or 'N/A' or 'Pending', as you prefer
        -- 5) completed but beyond 24 hours -> late
        WHEN TIMESTAMPDIFF(
          HOUR, 
          CONCAT(d.dt, ' 00:00:00'), 
          c.completed_at
        ) > 24 THEN CONCAT(
          'Yes (', 
          TIMESTAMPDIFF(
            HOUR, 
            CONCAT(d.dt, ' 00:00:00'), 
            c.completed_at
          ), 
          ' hrs)'
        ) -- 6) completed within 24 hours -> on time
        ELSE 'No' END AS status, 
        CASE WHEN c.id IS NULL THEN NULL ELSE TIMESTAMPDIFF(
          HOUR, 
          CONCAT(d.dt, ' 00:00:00'), 
          c.completed_at
        ) END AS hours_late, 
        CASE WHEN c.completed_at IS NULL THEN NULL ELSE DATE_FORMAT(c.completed_at, '%Y-%m-%d %T') END AS completed_at, 
        c.remarks 
      FROM 
        tasks_list tl -- only tasks that have an active assignment for this user (inner join)
        INNER JOIN user_task_assignments uta ON uta.task_list_id = tl.id 
        AND uta.user_id = ? 
        AND uta.is_active = 1 CROSS 
        JOIN dates d 
        LEFT JOIN users_daily_task_completions c ON c.task_list_id = tl.id 
        AND c.user_id = ? 
        AND c.for_date = d.dt 
        AND c.is_active = 1 
      WHERE 
        tl.is_active = 1 
      ORDER BY 
        tl.id, 
        d.dt;
      `;

    const params = [startOfMonth, startOfMonth, userId, userId];
    const rows = await runMysql(sql, params);

    const normalizedRows =
      Array.isArray(rows) && rows.length && rows[0] && rows[0].task_id === undefined
        ? (rows[0] || [])
        : rows || [];

    return res.json({
      year,
      month,
      startOfMonth,
      data: normalizedRows,
    });
  } catch (error) {
    console.error('Error fetching month report:', error);
    return res.status(500).json({ error: 'An error occurred while fetching month report.' });
  }
};

// Helper – keep response shape consistent with rest of file if needed
function sendSuccess(res, data = {}, status = 200) {
  return res.status(status).json({ success: true, ...data });
}

function sendError(res, message = "Something went wrong", status = 500) {
  return res.status(status).json({ success: false, error: message });
}

// New: add or update remark/comment for a daily task
export async function saveTaskRemarks(req, res) {
  try {
    const taskId = Number(req.params.id);
    if (!taskId || Number.isNaN(taskId)) {
      return sendError(res, "Invalid task id", 400);
    }

    const { remarks, comments, for_date, user_id } = req.body || {};
    const user = req.user;

    if (!user || !user.id) {
      return sendError(res, "Unauthorized", 401);
    }

    // Decide which user this remark/comment belongs to
    let targetUserId;

    if (user.role === "admin" || user.role === "manager") {
      // Admin can comment on any selected user (must be provided by frontend)
      const bodyUserId = Number(user_id);
      if (!bodyUserId || Number.isNaN(bodyUserId)) {
        return sendError(res, "user_id is required for admin comments", 400);
      }
      targetUserId = bodyUserId;
    } else {
      // Normal user: always use his/her own id; ignore any user_id from body for safety
      targetUserId = user.id;
    }

    // require date; if not given, default to today
    const dateStr = (for_date && String(for_date).trim())
      ? String(for_date).slice(0, 10)   // YYYY-MM-DD
      : new Date().toISOString().slice(0, 10);

    // If user typed only remarks → send only remarks.
    // If admin typed only comments → send only comments.
    const payload = {
      task_list_id: taskId,
      user_id: targetUserId,
      for_date: dateStr,
      remarks: remarks ?? null,
      comments: comments ?? null,
      comment_by: comments ? user.id : null
    };

    const result = await UsersDailyTaskRemarksModel.upsert(payload);
    if (!result.success) {
      return sendError(res, result.error || "Failed to save remark/comment", 500);
    }

    return sendSuccess(
      res,
      {
        message: "Remark/comment saved",
        data: {
          task_list_id: taskId,
          user_id: targetUserId,
          for_date: dateStr
        }
      },
      200
    );

  } catch (err) {
    console.error("dailyTasks.saveTaskRemarks ERR:", err);
    return sendError(res, err.message || String(err), 500);
  }
}





