// controllers/dailyTasks.controller.js
import { log } from '../config/db.js';
import * as model from '../models/dailyTasks.model.js';

// Helper: get weekday short string from date (JS Date or YYYY-MM-DD)
const weekdayShort = (d) => {
  const dt = (typeof d === 'string') ? new Date(d + 'T00:00:00') : d;
  return ['sun','mon','tue','wed','thu','fri','sat'][dt.getDay()];
};

// GET /tasks/today?date=YYYY-MM-DD
export const getTodayTasks = async (req, res) => {
  try {
    const user_id = req.user?.id || parseInt(req.query.user_id, 10);
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const date = req.query.date || (new Date()).toISOString().slice(0,10); // YYYY-MM-DD
    const w = weekdayShort(date);

    const sql = `
      SELECT udt.*,
             CASE WHEN udc.id IS NOT NULL THEN 1 ELSE 0 END AS is_completed,
             udc.completed_at, udc.remarks
      FROM users_daily_tasks udt
      LEFT JOIN users_daily_task_completions udc
        ON udc.task_id = udt.id
        AND udc.for_date = ?
        AND udc.user_id = ?
      WHERE udt.is_active = 1
        AND udt.user_id = ?
        AND (
             udt.recurrence_type = 'daily'
             OR (udt.recurrence_type = 'weekly' AND FIND_IN_SET(?, udt.recurrence_weekdays))
             OR (udt.recurrence_type = 'once' AND udt.once_date = ?)
        )
      ORDER BY FIELD(udt.priority,'high','medium','low'), udt.id
    `;
    const [rows] = await model.pool.query(sql, [date, user_id, user_id, w, date]);
    return res.json({ date, tasks: rows });
  } catch (err) {
    console.error('getTodayTasks err', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};

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
    const task_id = req.params.id;
    const user_id = req.body.user_id || req.user?.id;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const for_date = req.body.for_date || (new Date()).toISOString().slice(0,10);
    const remarks = req.body.remarks || null;

    const completion = await model.markComplete({ task_id, user_id, for_date, remarks }); log(completion);
    return res.json({ completion });
  } catch (err) {
    console.error('completeTask err', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};

// POST /tasks/:id/undo_complete  body: { for_date, user_id (optional) }
export const undoComplete = async (req, res) => {
  try {
    const task_id = req.params.id;
    const user_id = req.body.user_id || req.user?.id; log(user_id);
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const for_date = req.body.for_date || (new Date()).toISOString().slice(0,10);
    const ok = await model.undoComplete({ task_id, user_id, for_date }); log(ok);
    return res.json({ success: ok });
  } catch (err) {
    console.error('undoComplete err', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
