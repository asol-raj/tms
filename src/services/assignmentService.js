// src/services/assignmentService.js
// ESM - requires src/config/db.js to export { pool, runMysql, readFileContent, log }

import { pool, log } from "../config/db.js";

/**
 * Assign a template to a set of users selected by filters.
 *
 * - taskListId: number
 * - options:
 *    - assignedBy: user id (admin) - optional
 *    - userFilter: SQL WHERE fragment for users table (string) OR object { is_active:1, user_role:'user' } (recommended)
 *    - createTodayCompletions: boolean (default false) - create users_daily_task_completions for today
 *
 * Behavior:
 *  - Uses INSERT ... SELECT ... ON DUPLICATE KEY UPDATE to avoid duplicates and to reactivate/update assignment timestamp.
 *  - Transactional (assign + optional create completions).
 */
export async function assignTaskToUsers(taskListId, options = {}) {
  const { assignedBy = null, userFilter = { is_active: 1, user_role: "user" }, createTodayCompletions = false } = options;

  // Build simple filters object -> SQL AND clause + params
  const filters = [];
  const paramsForUsers = [];
  if (userFilter && typeof userFilter === "object") {
    if (userFilter.is_active !== undefined) {
      filters.push("u.is_active = ?");
      paramsForUsers.push(userFilter.is_active ? 1 : 0);
    }
    if (userFilter.user_role) {
      filters.push("u.user_role = ?");
      paramsForUsers.push(userFilter.user_role);
    }
    if (userFilter.id_list && Array.isArray(userFilter.id_list) && userFilter.id_list.length) {
      // optional explicit list of user ids
      filters.push(`u.id IN (${userFilter.id_list.map(() => "?").join(",")})`);
      paramsForUsers.push(...userFilter.id_list);
    }
  } else if (typeof userFilter === "string") {
    // Danger: using raw SQL string - only use when safe
    filters.push(userFilter);
  }

  const whereClause = filters.length ? ("WHERE " + filters.join(" AND ")) : "";

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Insert assignments for matching users. Use ON DUPLICATE KEY UPDATE to reactivate/update timestamp.
    const insertAssignSql = `
      INSERT INTO user_task_assignments
        (task_list_id, user_id, assigned_by, assigned_at, start_date, end_date, is_active)
      SELECT ?, u.id, ?, NOW(), NULL, NULL, 1
      FROM users u
      ${whereClause}
      ON DUPLICATE KEY UPDATE
        assigned_by = VALUES(assigned_by),
        assigned_at = VALUES(assigned_at),
        is_active = 1
    `;

    // Query params: first taskListId and assignedBy, then params for user filter
    const insertAssignParams = [taskListId, assignedBy, ...paramsForUsers];
    await conn.query(insertAssignSql, insertAssignParams);

    // 2) Optionally create today's completion rows (if they don't already exist)
    if (createTodayCompletions) {
      const insertCompletionsSql = `
        INSERT INTO users_daily_task_completions
          (task_list_id, user_id, completed_at, for_date, remarks, is_active)
        SELECT uta.task_list_id, uta.user_id, NULL, CURDATE(), NULL, 1
        FROM user_task_assignments uta
        LEFT JOIN users_daily_task_completions udc
          ON udc.task_list_id = uta.task_list_id
         AND udc.user_id = uta.user_id
         AND udc.for_date = CURDATE()
        JOIN users u ON u.id = uta.user_id
        ${whereClause ? ("WHERE " + ["uta.is_active = 1", "(uta.start_date IS NULL OR uta.start_date <= CURDATE())", "(uta.end_date IS NULL OR uta.end_date >= CURDATE())", ...filters].join(" AND ")) :
                       "WHERE uta.is_active = 1 AND (uta.start_date IS NULL OR uta.start_date <= CURDATE()) AND (uta.end_date IS NULL OR uta.end_date >= CURDATE())"}
        AND udc.id IS NULL
      `;

      // Params: taskListId inserted via join on uta (we already limited uta by task_list_id in SELECT by joining previously - but we didn't)
      // To restrict to the same users and same taskListId, we should add uta.task_list_id = ?
      // Let's do that via a slightly modified query:
      const insertCompletionsSql2 = `
        INSERT INTO users_daily_task_completions
          (task_list_id, user_id, completed_at, for_date, remarks, is_active)
        SELECT uta.task_list_id, uta.user_id, NULL, CURDATE(), NULL, 1
        FROM user_task_assignments uta
        LEFT JOIN users_daily_task_completions udc
          ON udc.task_list_id = uta.task_list_id
         AND udc.user_id = uta.user_id
         AND udc.for_date = CURDATE()
        JOIN users u ON u.id = uta.user_id
        WHERE uta.task_list_id = ?
          AND uta.is_active = 1
          AND (uta.start_date IS NULL OR uta.start_date <= CURDATE())
          AND (uta.end_date IS NULL OR uta.end_date >= CURDATE())
          AND udc.id IS NULL
      `;

      await conn.query(insertCompletionsSql2, [taskListId]);
    }

    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    if (typeof log === "function") log("assignTaskToUsers ERR:", err);
    else console.error("assignTaskToUsers ERR:", err);
    return { success: false, error: err.message || String(err) };
  } finally {
    conn.release();
  }
}

/**
 * Remove assignment(s) for a given task_list_id.
 *
 * - taskListId: number (required)
 * - options:
 *    - userId: number|null  => if provided, remove assignment only for that user; otherwise remove for all users
 *    - removeCompletions: boolean (default false) => if true, also delete related users_daily_task_completions rows
 *
 * Returns { success: true } or { success:false, error }
 */
export async function removeAssignment(taskListId, options = {}) {
  const { userId = null, removeCompletions = false } = options;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (removeCompletions) {
      if (userId) {
        await conn.query(
          `DELETE FROM users_daily_task_completions WHERE task_list_id = ? AND user_id = ?`,
          [taskListId, userId]
        );
      } else {
        await conn.query(
          `DELETE FROM users_daily_task_completions WHERE task_list_id = ?`,
          [taskListId]
        );
      }
    }

    if (userId) {
      const [res] = await conn.query(
        `DELETE FROM user_task_assignments WHERE task_list_id = ? AND user_id = ?`,
        [taskListId, userId]
      );
      await conn.commit();
      if (res.affectedRows === 0) return { success: false, error: "No assignment found for that user" };
      return { success: true };
    } else {
      // delete all assignments for this task
      await conn.query(
        `DELETE FROM user_task_assignments WHERE task_list_id = ?`,
        [taskListId]
      );
      await conn.commit();
      return { success: true };
    }

  } catch (err) {
    await conn.rollback();
    if (typeof log === "function") log("removeAssignment ERR:", err);
    else console.error("removeAssignment ERR:", err);
    return { success: false, error: err.message || String(err) };
  } finally {
    conn.release();
  }
}
