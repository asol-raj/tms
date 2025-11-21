// src/models/userTaskAssignment.model.js
import { pool, runMysql, readFileContent, log } from "../config/db.js";

/**
 * Model for user_task_assignments
 * Methods:
 *  - create(payload)
 *  - getById(id)
 *  - getAll(filters)
 *  - update(id, payload)
 *  - delete(id)
 */

function normalize(row) {
  if (!row) return null;
  return {
    ...row,
    assigned_at: row.assigned_at ? new Date(row.assigned_at) : null,
    start_date: row.start_date ? row.start_date : null,
    end_date: row.end_date ? row.end_date : null,
    is_active: row.is_active === 1 || row.is_active === true ? 1 : 0
  };
}

const UserTaskAssignmentModel = {

  // create an assignment
  async create(data) {
    try {
      const sql = `
        INSERT INTO user_task_assignments
          (task_list_id, user_id, assigned_by, start_date, end_date, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const params = [
        data.task_list_id,
        data.user_id,
        data.assigned_by ?? null,
        // data.assigned_at ?? null, // allow explicit assigned_at or default DB value
        data.start_date ?? null,
        data.end_date ?? null,
        data.is_active ?? 1
      ];

      const [result] = await pool.query(sql, params);
      return { success: true, id: result.insertId };

    } catch (err) {
      if (typeof log === "function") log("UserTaskAssignmentModel.create ERR:", err);
      else console.error("UserTaskAssignmentModel.create ERR:", err);

      // Duplicate assignment -> return meaningful message
      if (err && err.code === "ER_DUP_ENTRY") {
        return { success: false, error: "Assignment already exists for this user and task" };
      }

      return { success: false, error: err.message || String(err) };
    }
  },

  // get by id (includes some task/user info via JOIN)
  async getById(id) {
    try {
      const sql = `
        SELECT uta.*, tl.title AS task_title, u.email AS user_email, u.fullname AS user_fullname
        FROM user_task_assignments uta
        LEFT JOIN tasks_list tl ON tl.id = uta.task_list_id
        LEFT JOIN users u ON u.id = uta.user_id
        WHERE uta.id = ?
        LIMIT 1
      `;
      const [rows] = await pool.query(sql, [id]);
      if (!rows.length) return { success: false, error: "Not found" };
      return { success: true, data: normalize(rows[0]) };

    } catch (err) {
      if (typeof log === "function") log("UserTaskAssignmentModel.getById ERR:", err);
      else console.error("UserTaskAssignmentModel.getById ERR:", err);
      return { success: false, error: err.message || String(err) };
    }
  },

  // get list with filters: user_id, task_list_id, is_active, assigned_by
  async getAll(filters = {}) {
    try {
      let sql = `
        SELECT uta.*, tl.title AS task_title, u.email AS user_email, u.fullname AS user_fullname
        FROM user_task_assignments uta
        LEFT JOIN tasks_list tl ON tl.id = uta.task_list_id
        LEFT JOIN users u ON u.id = uta.user_id
        WHERE 1=1
      `;
      const params = [];

      if (filters.user_id) {
        sql += " AND uta.user_id = ?";
        params.push(filters.user_id);
      }
      if (filters.task_list_id) {
        sql += " AND uta.task_list_id = ?";
        params.push(filters.task_list_id);
      }
      if (filters.assigned_by) {
        sql += " AND uta.assigned_by = ?";
        params.push(filters.assigned_by);
      }
      if (filters.is_active !== undefined) {
        sql += " AND uta.is_active = ?";
        params.push(filters.is_active ? 1 : 0);
      }

      sql += " ORDER BY uta.assigned_at DESC";

      const [rows] = await pool.query(sql, params);
      return { success: true, data: rows.map(normalize) };

    } catch (err) {
      if (typeof log === "function") log("UserTaskAssignmentModel.getAll ERR:", err);
      else console.error("UserTaskAssignmentModel.getAll ERR:", err);
      return { success: false, error: err.message || String(err) };
    }
  },

  // update assignment (partial updates are allowed; pass fields to change)
  async update(id, data) {
    try {
      // Build dynamic set clause
      const keys = [];
      const params = [];

      const allowed = ["task_list_id", "user_id", "assigned_by", "assigned_at", "start_date", "end_date", "is_active"];
      for (const k of allowed) {
        if (data[k] !== undefined) {
          keys.push(`${k} = ?`);
          params.push(data[k]);
        }
      }

      if (!keys.length) return { success: false, error: "No fields to update" };

      params.push(id);
      const sql = `UPDATE user_task_assignments SET ${keys.join(", ")} WHERE id = ?`;
      const [result] = await pool.query(sql, params);

      if (result.affectedRows === 0) return { success: false, error: "Not found or no change" };
      return { success: true };

    } catch (err) {
      if (typeof log === "function") log("UserTaskAssignmentModel.update ERR:", err);
      else console.error("UserTaskAssignmentModel.update ERR:", err);

      if (err && err.code === "ER_DUP_ENTRY") {
        return { success: false, error: "Assignment already exists for this user and task" };
      }

      return { success: false, error: err.message || String(err) };
    }
  },

  // hard delete
  async delete(id) {
    try {
      const sql = "DELETE FROM user_task_assignments WHERE id = ?";
      const [result] = await pool.query(sql, [id]);
      if (result.affectedRows === 0) return { success: false, error: "Not found" };
      return { success: true };

    } catch (err) {
      if (typeof log === "function") log("UserTaskAssignmentModel.delete ERR:", err);
      else console.error("UserTaskAssignmentModel.delete ERR:", err);
      return { success: false, error: err.message || String(err) };
    }
  }

};

export default UserTaskAssignmentModel;
