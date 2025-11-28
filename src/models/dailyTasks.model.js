// src/models/dailyTasks.model.js
import { log, pool } from '../config/db.js';

/**
 * getTasks(options)
 *
 * options:
 *  - requestingUser: { id, role }   (required)
 *  - userId: optional (admin-only)   -> when provided admin views that user's tasks
 *  - forDate: optional 'YYYY-MM-DD'  -> date to check completion for (defaults to today)
 *  - includeInactive: boolean (default false)
 *
 * Behavior:
 *  - Returns one row per task.
 *  - Admins receive `assigned_users` (array of {id, fullname}).
 *  - Completion fields are populated only when a target user is known:
 *      - Non-admin: target = requestingUser.id
 *      - Admin + userId: target = userId
 *      - Admin without userId: no target -> completion fields null
 */
export const getTasks = async (options = {}) => {
  const {
    requestingUser,
    userId = null,
    forDate = null,
    includeInactive = false
  } = options;

  if (!requestingUser || !requestingUser.id) {
    throw new Error('requestingUser with id is required');
  }

  // compute date to use for completion checks (YYYY-MM-DD)
  const dateParam = forDate ? forDate : (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  // compute weekday if forDate provided
  let weekdayParam = null;
  if (forDate) {
    const dt = new Date(forDate + 'T00:00:00');
    if (Number.isNaN(dt.getTime())) {
      throw new Error('Invalid forDate');
    }
    const map = ['sun','mon','tue','wed','thu','fri','sat'];
    weekdayParam = map[dt.getUTCDay()];
  }

  // Determine target user for completion & assignment-specific info:
  const isAdmin = requestingUser.role === 'admin';
  const targetUserId = isAdmin ? (userId ? Number(userId) : null) : Number(requestingUser.id);

  // Aggregate assigned users for admin view
  const assignAgg = isAdmin
    ? `, JSON_ARRAYAGG(u2.fullname) AS assigned_users`
    : '';

  // Target-specific columns (assignment & completion) or NULLs if no target
  // NOTE: is_delayed now checks if a completion exists AND the DATE(completed_at) is after the for_date
  const targetCols = targetUserId ? `
    uta_for_user.id AS assignment_id,
    DATE_FORMAT(uta_for_user.assigned_at, '%m-%d-%Y') AS assigned_on,
    uta_for_user.start_date AS assignment_start_date,
    uta_for_user.end_date AS assignment_end_date,
    uta_for_user.is_active AS assignment_active,
    CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS is_completed,
    c.id AS completion_id,
    DATE_FORMAT(c.for_date, '%m-%d-%Y') AS for_date,
    DATE_FORMAT(c.completed_at, '%m-%d-%Y %T') AS completed_at,
    -- CASE WHEN c.id IS NOT NULL AND DATE(c.completed_at) > c.for_date THEN 'Yes' ELSE 'No' END AS is_delayed,
    -- CASE
    --   WHEN c.id IS NOT NULL AND TIMESTAMPDIFF(HOUR, CONCAT(c.for_date, ' 00:00:00'), c.completed_at) > 24
    --   THEN CONCAT('Yes (', TIMESTAMPDIFF(HOUR, CONCAT(c.for_date, ' 00:00:00'), c.completed_at), ' hrs)')
    --   ELSE 'No'
    -- END AS is_delayed
    CASE
    WHEN c.id IS NULL THEN 'N/A'
    WHEN TIMESTAMPDIFF(
          HOUR,
          CONCAT(c.for_date, ' 00:00:00'),
          c.completed_at
        ) > 24
      THEN CONCAT(
            'Yes (',
            TIMESTAMPDIFF(
              HOUR,
              CONCAT(c.for_date, ' 00:00:00'),
              c.completed_at
            ),
            ' hrs)'
          )
    ELSE 'No'
  END AS is_delayed
  ` : `
    NULL AS assignment_id,
    NULL AS assigned_on,
    NULL AS assignment_start_date,
    NULL AS assignment_end_date,
    NULL AS assignment_active,
    NULL AS is_completed,
    NULL AS completion_id,
    NULL AS for_date,
    NULL AS completed_at,
    NULL AS is_delayed,
    NULL AS remarks
  `;

  // Build SQL - **note the comma after updated_at**
  let sql = `
    SELECT
      tl.id,
      tl.task_list_id,
      tl.title,
      tl.description,
      tl.priority,
      tl.recurrence_type,
      tl.recurrence_weekdays,
      DATE_FORMAT(tl.once_date, '%m-%d-%Y') AS once_date,
      tl.is_active AS task_active,
      DATE_FORMAT(tl.created_at, '%m-%d-%Y') AS created_at,
      DATE_FORMAT(tl.updated_at, '%m-%d-%Y') AS updated_at,
      ${targetCols}
      ${assignAgg}
    FROM tasks_list tl
    LEFT JOIN user_task_assignments uta_all ON uta_all.task_list_id = tl.id AND uta_all.is_active = 1
    LEFT JOIN users u2 ON u2.id = uta_all.user_id
  `;

  const params = [];

  // Join per-target assignment and completion if targetUserId present
  if (targetUserId) {
    sql += `
      LEFT JOIN user_task_assignments uta_for_user
        ON uta_for_user.task_list_id = tl.id
        AND uta_for_user.user_id = ?
    `;
    params.push(targetUserId);

    sql += `
      LEFT JOIN users_daily_task_completions c
        ON c.task_list_id = tl.id
        AND c.user_id = ?
        AND c.for_date = ?
        AND c.is_active = 1
    `;
    params.push(targetUserId, dateParam);
  }

  // WHERE clauses
  const where = [];

  if (isAdmin) {
    if (userId) {
      where.push('EXISTS (SELECT 1 FROM user_task_assignments uta_check WHERE uta_check.task_list_id = tl.id AND uta_check.user_id = ?)');
      params.push(userId);
    } else {
      // where.push("tl.recurrence_type = 'daily'");
    }
  } else {
    where.push('EXISTS (SELECT 1 FROM user_task_assignments uta_check WHERE uta_check.task_list_id = tl.id AND uta_check.user_id = ? AND uta_check.is_active = 1)');
    params.push(requestingUser.id);
  }

  if (!includeInactive) {
    where.push('tl.is_active = 1');
  }

  if (forDate) {
    if (!weekdayParam) throw new Error('Invalid forDate');
    where.push(`(
      tl.recurrence_type = 'daily'
      OR (tl.recurrence_type = 'weekly' AND FIND_IN_SET(?, tl.recurrence_weekdays))
      OR (tl.recurrence_type = 'once' AND tl.once_date = ?)
    )`);
    params.push(weekdayParam, forDate);
  }

  if (where.length) {
    sql += '\n WHERE ' + where.join(' AND ') + '\n';
  }

  // GROUP BY (one row per task)
  sql += `
    GROUP BY tl.id
    ORDER BY FIELD(tl.priority, 'high', 'medium', 'low') DESC, tl.id;
    `;
  // log(sql);
  // Execute
  const [rows] = await pool.query(sql, params);
  return rows;
  // Normalize rows (previous code returned early which skipped this mapping; fixed)
  const resultRows = Array.isArray(rows) ? rows : rows?.rows ?? [];

  // Normalizers
  const normalizeNull = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'string' && v.trim().toUpperCase() === 'NULL') return null;
    return v;
  };
  const normalizeBool = (v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'number') return v === 1;
    if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true';
    return Boolean(v);
  };
  const parseRecurrenceWeekdays = (raw) => {
    if (!raw) return null;
    raw = normalizeNull(raw);
    if (!raw) return null;
    if (/^\{.*\}$/.test(raw)) {
      return raw.slice(1, -1).split(',').map(s => s.replace(/['"]/g, '').trim()).filter(Boolean);
    }
    return raw.replace(/['"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
  };
  const parseAssignedUsers = (val) => {
    if (!val) return [];
    try {
      if (typeof val === 'string') return JSON.parse(val);
      return val;
    } catch (e) {
      return [];
    }
  };

  // Map output
  return resultRows.map(r => {
    const recurrence_weekdays = parseRecurrenceWeekdays(r.recurrence_weekdays);
    const assignedUsers = isAdmin ? parseAssignedUsers(r.assigned_users) : undefined;

    return {
      id: Number(r.id),
      task_list_id: normalizeNull(r.task_list_id),
      title: normalizeNull(r.title),
      description: normalizeNull(r.description),
      priority: normalizeNull(r.priority),
      recurrence_type: normalizeNull(r.recurrence_type),
      recurrence_weekdays,
      once_date: normalizeNull(r.once_date),
      task_active: normalizeBool(r.task_active),
      created_at: normalizeNull(r.created_at),
      updated_at: normalizeNull(r.updated_at),

      assignment_id: r.assignment_id ? Number(r.assignment_id) : null,
      assigned_on: normalizeNull(r.assigned_on),
      assignment_start_date: normalizeNull(r.assignment_start_date),
      assignment_end_date: normalizeNull(r.assignment_end_date),
      assignment_active: r.assignment_active != null ? normalizeBool(r.assignment_active) : null,

      is_completed: r.is_completed != null ? normalizeBool(r.is_completed) : null,
      completion_id: r.completion_id ? Number(r.completion_id) : null,
      logged_at: normalizeNull(r.logged_at),
      completed_on: normalizeNull(r.completed_on),
      remarks: normalizeNull(r.remarks),
      is_delayed: r.is_delayed ? String(r.is_delayed).toLowerCase() === 'yes' : null,

      ...(isAdmin ? { assigned_users: assignedUsers } : {})
    };
  });
};


export const markComplete = async ({ task_list_id, user_id, for_date, remarks }) => {
  const sql = `
    INSERT INTO users_daily_task_completions (task_list_id, user_id, for_date, remarks, is_active)
    VALUES (?, ?, ?, ?, 1)
    ON DUPLICATE KEY UPDATE
      completed_at = CURRENT_TIMESTAMP,
      remarks = VALUES(remarks),
      is_active = 1,
      deleted_at = NULL
  `;
  const params = [task_list_id, user_id, for_date, remarks || null];
  await pool.query(sql, params);
  const [rows] = await pool.query(
    `SELECT * FROM users_daily_task_completions WHERE task_list_id = ? AND user_id = ? AND for_date = ? LIMIT 1`,
    [task_list_id, user_id, for_date]
  );
  return rows[0] || null;
};

export const undoComplete = async ({ task_list_id, user_id, for_date }) => {
  const sql = `UPDATE users_daily_task_completions
               SET is_active = 0, deleted_at = CURRENT_TIMESTAMP
               WHERE task_list_id = ? AND user_id = ? AND for_date = ?`;
  const [res] = await pool.query(sql, [task_list_id, user_id, for_date]);
  return res.affectedRows > 0;
};
