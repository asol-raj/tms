// models/dailyTasks.model.js
// ESM version. Uses pool from your project.
import { pool } from '../config/db.js';

/*
  TASK TEMPLATES (users_daily_tasks)
*/

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
const WEEKENDS = ['sat', 'sun'];

export const createTask = async (task) => {
  // Normalize recurrence_type: map UI-only types to DB allowed values
  let recurrence_type = (task.recurrence_type || 'daily').toString().toLowerCase();

  // if UI sent 'weekdays' or 'weekends', convert to 'weekly' and set recurrence_weekdays
  let recurrence_weekdays = null;
  if (recurrence_type === 'weekdays') {
    recurrence_type = 'weekly';
    recurrence_weekdays = WEEKDAYS.join(',');
  } else if (recurrence_type === 'weekends') {
    recurrence_type = 'weekly';
    recurrence_weekdays = WEEKENDS.join(',');
  } else if (recurrence_type === 'weekly') {
    // use passed recurrence_weekdays (could be array or comma string)
    if (Array.isArray(task.recurrence_weekdays)) {
      recurrence_weekdays = task.recurrence_weekdays.join(',');
    } else {
      recurrence_weekdays = task.recurrence_weekdays ? task.recurrence_weekdays : null;
    }
  } else {
    // daily or once
    recurrence_weekdays = null;
  }

  // Normalize once_date: empty string -> null
  const once_date = (task.once_date && task.once_date.trim() !== '') ? task.once_date : null;

  const sql = `INSERT INTO users_daily_tasks
    (user_id, title, description, priority, assigned_by, recurrence_type, recurrence_weekdays, once_date, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    task.user_id,
    task.title,
    task.description || null,
    task.priority || 'low',
    task.assigned_by || null,
    recurrence_type,
    recurrence_weekdays,
    once_date,
    typeof task.is_active === 'undefined' ? 1 : task.is_active
  ];
  const [res] = await pool.query(sql, params);
  return { id: res.insertId, ...task, recurrence_type, recurrence_weekdays, once_date };
};


export const getTaskById = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM users_daily_tasks WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

export const updateTask = async (id, updates) => {
  // Normalize recurrence_type and recurrence_weekdays if present in updates
  if ('recurrence_type' in updates) {
    let rt = (updates.recurrence_type || '').toString().toLowerCase();

    if (rt === 'weekdays') {
      updates.recurrence_type = 'weekly';
      updates.recurrence_weekdays = WEEKDAYS.join(',');
    } else if (rt === 'weekends') {
      updates.recurrence_type = 'weekly';
      updates.recurrence_weekdays = WEEKENDS.join(',');
    } else if (rt === 'weekly') {
      // ensure recurrence_weekdays is a CSV string if array provided
      if ('recurrence_weekdays' in updates) {
        if (Array.isArray(updates.recurrence_weekdays)) {
          updates.recurrence_weekdays = updates.recurrence_weekdays.join(',');
        } else if (!updates.recurrence_weekdays) {
          updates.recurrence_weekdays = null;
        }
      }
    } else if (rt === 'daily' || rt === 'once') {
      updates.recurrence_type = rt;
      // clear recurrence_weekdays for daily/once
      updates.recurrence_weekdays = null;
      // ensure once_date is null for daily
      if (rt === 'daily') updates.once_date = null;
    } else {
      // unexpected value: default to 'daily'
      updates.recurrence_type = 'daily';
      updates.recurrence_weekdays = null;
      updates.once_date = null;
    }
  } else if ('recurrence_weekdays' in updates) {
    // if recurrence_type not changed but weekdays provided as array -> convert
    if (Array.isArray(updates.recurrence_weekdays)) {
      updates.recurrence_weekdays = updates.recurrence_weekdays.join(',');
    } else if (!updates.recurrence_weekdays) {
      updates.recurrence_weekdays = null;
    }
  }

  // Normalize once_date empty string -> null
  if ('once_date' in updates) {
    updates.once_date = (updates.once_date && updates.once_date.trim() !== '') ? updates.once_date : null;
  }

  const allowed = ['title', 'description', 'priority', 'assigned_by', 'recurrence_type', 'recurrence_weekdays', 'once_date', 'is_active', 'user_id'];
  const set = [];
  const params = [];
  for (const k of allowed) {
    if (k in updates) {
      set.push(`\`${k}\` = ?`);
      params.push(updates[k]);
    }
  }
  if (!set.length) return await getTaskById(id);
  params.push(id);
  const sql = `UPDATE users_daily_tasks SET ${set.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  await pool.query(sql, params);
  return await getTaskById(id);
};

export const deleteTask = async (id) => {
  const [res] = await pool.query(`DELETE FROM users_daily_tasks WHERE id = ?`, [id]);
  return res.affectedRows > 0;
};

export const listTasksForUser_ = async (user_id) => {
  const [rows] = await pool.query(`
    SELECT
        udt.id,
        udt.title,
        udt.description,
        udt.priority,
        a.fullname as assigned_by,
        udt.recurrence_type,
        udt.recurrence_weekdays,
        udt.once_date,
        udt.is_active,
        DATE_FORMAT(udt.created_at, '%m-%d-%Y') as created_at
    FROM
        users_daily_tasks udt
        JOIN users u on u.id = udt.user_id
        left JOIN users a on a.id = udt.assigned_by
    WHERE
        udt.user_id = ? and udt.is_active=true
    ORDER BY FIELD(
        udt.priority, 'high', 'medium', 'low'
    ), udt.id`,
    [user_id]);
  return rows;
};
export const listTasksForUser = async (user_id) => {
  const [rows] = await pool.query(`
    SELECT
      udt.id,
      udt.title,
      udt.description,
      udt.priority,
      a.fullname AS assigned_by,
      udt.recurrence_type,
      udt.recurrence_weekdays,
      DATE_FORMAT(udt.once_date, '%m-%d-%Y') AS once_date,
      udt.is_active,
      DATE_FORMAT(udt.created_at, '%m-%d-%Y') AS created_at,

      -- completion info for TODAY (server date)
      CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS is_completed,
      c.id AS completion_id,
      c.remarks AS completion_remarks,
      DATE_FORMAT(c.completed_at, '%Y-%m-%d %T') AS completion_at

    FROM users_daily_tasks udt
    JOIN users u ON u.id = udt.user_id
    LEFT JOIN users a ON a.id = udt.assigned_by

    -- left join to today's active completion by the task owner
    LEFT JOIN users_daily_task_completions c
      ON c.task_id = udt.id
      AND c.user_id = udt.user_id
      AND c.for_date = CURDATE()
      AND c.is_active = 1

    WHERE udt.user_id = ? AND udt.is_active = TRUE
    ORDER BY FIELD(udt.priority, 'high', 'medium', 'low'), udt.id
  `, [user_id]);
  return rows;
};


export const listDailyTasksForAllUsers = async () => {
  const [rows] = await pool.query(`
    SELECT
      udt.id,
      u.fullname AS user,
      udt.title,
      udt.description,
      udt.priority,
      a.fullname AS assigned_by,
      udt.recurrence_type,
      udt.recurrence_weekdays,
      DATE_FORMAT(udt.once_date, '%m-%d-%Y') AS once_date,
      udt.is_active,
      DATE_FORMAT(udt.created_at, '%m-%d-%Y') AS created_at,

      -- completion info for TODAY (server date) for each task owner
      CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS is_completed,
      c.id AS completion_id,
      c.user_id AS completion_user_id,
      c.remarks AS completion_remarks,
      DATE_FORMAT(c.completed_at, '%Y-%m-%d %T') AS completion_at

    FROM users_daily_tasks udt
    JOIN users u ON u.id = udt.user_id
    LEFT JOIN users a ON a.id = udt.assigned_by

    LEFT JOIN users_daily_task_completions c
      ON c.task_id = udt.id
      AND c.user_id = udt.user_id
      AND c.for_date = CURDATE()
      AND c.is_active = 1

    ORDER BY udt.id DESC
  `, []);
  return rows;
};

export const listDailyTasksForAllUsers_ = async () => {
  const [rows] = await pool.query(`
    SELECT
        udt.id,
        u.fullname as user,
        udt.title,
        udt.description,
        udt.priority,
        a.fullname as assigned_by,
        udt.recurrence_type,
        udt.recurrence_weekdays,
        udt.once_date,
        udt.is_active,
        DATE_FORMAT(udt.created_at, '%m-%d-%Y') as created_at
    FROM
        users_daily_tasks udt
        JOIN users u on u.id = udt.user_id
        left JOIN users a on a.id = udt.assigned_by
    ORDER BY udt.id DESC`,
    []);
  return rows;
};

/*
  COMPLETIONS (users_daily_task_completions)
*/
export const markComplete_ = async ({ task_id, user_id, for_date, remarks }) => {
  const sql = `
    INSERT INTO users_daily_task_completions (task_id, user_id, for_date, remarks)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE completed_at = CURRENT_TIMESTAMP, remarks = VALUES(remarks)
  `;
  const params = [task_id, user_id, for_date, remarks || null];
  await pool.query(sql, params);
  const [rows] = await pool.query(`SELECT * FROM users_daily_task_completions WHERE task_id = ? AND user_id = ? AND for_date = ? LIMIT 1`, [task_id, user_id, for_date]);
  return rows[0] || null;
};

export const markComplete = async ({ task_id, user_id, for_date, remarks }) => {
  const sql = `
    INSERT INTO users_daily_task_completions (task_id, user_id, for_date, remarks, is_active)
    VALUES (?, ?, ?, ?, 1)
    ON DUPLICATE KEY UPDATE
      completed_at = CURRENT_TIMESTAMP,
      remarks = VALUES(remarks),
      is_active = 1,
      deleted_at = NULL
  `;
  const params = [task_id, user_id, for_date, remarks || null];
  await pool.query(sql, params);
  const [rows] = await pool.query(
    `SELECT * FROM users_daily_task_completions WHERE task_id = ? AND user_id = ? AND for_date = ? LIMIT 1`,
    [task_id, user_id, for_date]
  );
  return rows[0] || null;
};

export const undoComplete_ = async ({ task_id, user_id, for_date }) => {
  const [res] = await pool.query(`DELETE FROM users_daily_task_completions WHERE task_id = ? AND user_id = ? AND for_date = ?`, [task_id, user_id, for_date]);
  return res.affectedRows > 0;
};

export const undoComplete = async ({ task_id, user_id, for_date }) => {
  const sql = `UPDATE users_daily_task_completions
               SET is_active = 0, deleted_at = CURRENT_TIMESTAMP
               WHERE task_id = ? AND user_id = ? AND for_date = ?`;
  const [res] = await pool.query(sql, [task_id, user_id, for_date]);
  return res.affectedRows > 0;
};

export const getCompletionsForDate = async ({ user_id, for_date }) => {
  const [rows] = await pool.query(`SELECT * FROM users_daily_task_completions WHERE user_id = ? AND for_date = ?`, [user_id, for_date]);
  return rows;
};


