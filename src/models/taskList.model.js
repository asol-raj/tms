// src/model/taskList.model.js
// ESM (type: "module")
// Requires src/config/db.js to export: { pool, runMysql, readFileContent, log }

import { pool, runMysql, readFileContent, log } from "../config/db.js";

/**
 * Helper: normalize a DB row into a nicer JS object
 */
function normalizeRow(row) {
  if (!row) return row;
  return {
    ...row,
    recurrence_weekdays: row.recurrence_weekdays
      ? String(row.recurrence_weekdays).split(",").filter(Boolean)
      : []
  };
}

const TaskListModel = {

  // CREATE a task template
  async create(data) {
    try {
      const sql = `
        INSERT INTO tasks_list 
          (title, description, priority, recurrence_type, recurrence_weekdays, once_date, created_by, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        data.title,
        data.description ?? null,
        data.priority ?? "low",
        data.recurrence_type ?? "daily",
        Array.isArray(data.recurrence_weekdays) ? data.recurrence_weekdays.join(",") : (data.recurrence_weekdays ?? null),
        data.once_date ?? null,
        data.created_by ?? null,
        (data.is_active ?? 1)
      ];

      const [result] = await pool.query(sql, params);
      return { success: true, id: result.insertId };

    } catch (err) {
      if (typeof log === "function") log("TaskList.create ERR:", err);
      else console.error("TaskList.create ERR:", err);
      return { success: false, error: err.message || String(err) };
    }
  },

  // READ single by ID
  async getById(id) {
    try {
      const sql = "SELECT * FROM tasks_list WHERE id = ?";
      const [rows] = await pool.query(sql, [id]);

      if (!rows.length) return { success: false, error: "Not found" };
      return { success: true, data: normalizeRow(rows[0]) };

    } catch (err) {
      if (typeof log === "function") log("TaskList.getById ERR:", err);
      else console.error("TaskList.getById ERR:", err);
      return { success: false, error: err.message || String(err) };
    }
  },

  // READ ALL with optional filters
  async getAll_(filters = {}) {
    try {
      // let sql = "SELECT * FROM tasks_list WHERE 1=1";
      let sql = `
        SELECT 
            l.id, 
            l.task_list_id, 
            l.title, 
            l.description, 
            l.priority, 
            l.recurrence_type,
            l.recurrence_weekdays, 
            l.once_date, 
            u.fullname as created_by, 
            ub.fullname as updated_by, 
            l.is_active,
        DATE_FORMAT(l.created_at, '%m/%d/%Y, %r') as created_at, 
        DATE_FORMAT(l.updated_at, '%m/%d/%Y, %r') as updated_at 
        FROM tasks_list l LEFT JOIN users u ON u.id = l.created_by LEFT JOIN users ub ON ub.id = l.updated_by
        WHERE 1=1`;

      const params = [];

      if (filters.is_active !== undefined) {
        sql += " AND l.is_active = ?";
        params.push(filters.is_active ? 1 : 0);
      }

      if (filters.created_by) {
        sql += " AND l.created_by = ?";
        params.push(filters.created_by);
      }

      if (filters.recurrence_type) {
        sql += " AND l.recurrence_type = ?";
        params.push(filters.recurrence_type);
      }

      sql += " ORDER BY l.id DESC";

      const [rows] = await pool.query(sql, params);
      return { success: true, data: rows.map(normalizeRow) };

    } catch (err) {
      if (typeof log === "function") log("TaskList.getAll ERR:", err);
      else console.error("TaskList.getAll ERR:", err);
      return { success: false, error: err.message || String(err) };
    }
  },

  async getAll(filters = {}) {
    try {
      const sql = `
      SELECT 
        l.id,
        l.task_list_id,
        l.title,
        l.description,
        l.priority,
        l.recurrence_type,
        l.recurrence_weekdays,
       -- l.once_date,
        DATE_FORMAT(l.once_date, '%m/%d/%Y') AS once_date,
        u.fullname AS created_by,
        ub.fullname AS updated_by,
        l.is_active,
        DATE_FORMAT(l.created_at, '%m/%d/%Y, %r') AS created_at,
        DATE_FORMAT(l.updated_at, '%m/%d/%Y, %r') AS updated_at,

        -- JSON array of assigned user names
        IF(
          COUNT(au.id) = 0,
          JSON_ARRAY(),   -- no assigned users → empty array
          JSON_ARRAYAGG(au.fullname)
        ) AS assigned_to

      FROM tasks_list l
      LEFT JOIN users u  ON u.id = l.created_by
      LEFT JOIN users ub ON ub.id = l.updated_by
      LEFT JOIN user_task_assignments uta 
            ON uta.task_list_id = l.id 
            AND uta.is_active = 1
      LEFT JOIN users au ON au.id = uta.user_id
      WHERE 1=1
    `;

      // build dynamic WHERE and params
      const whereParts = [];
      const params = [];

      if (filters.is_active !== undefined) {
        whereParts.push("l.is_active = ?");
        params.push(filters.is_active ? 1 : 0);
      }

      if (filters.created_by) {
        whereParts.push("l.created_by = ?");
        params.push(filters.created_by);
      }

      if (filters.recurrence_type) {
        whereParts.push("l.recurrence_type = ?");
        params.push(filters.recurrence_type);
      }

      // combine SQL
      const finalSql = sql + (whereParts.length ? (" AND " + whereParts.join(" AND ")) : "") + " GROUP BY l.id ORDER BY l.id DESC";

      const [rows] = await pool.query(finalSql, params);

      // normalize rows: parse JSON assigned_to and recurrence_weekdays to arrays
      const data = rows.map(r => {
        // assigned_to is returned as a JSON string (from mysql) — parse if necessary
        let assigned = r.assigned_to;
        try {
          if (typeof assigned === "string") assigned = JSON.parse(assigned);
          // If it's null or not an array, coerce to []
          if (!Array.isArray(assigned)) assigned = [];
        } catch (e) {
          // fallback: empty array
          assigned = [];
        }

        // recurrence_weekdays: convert CSV -> array (or empty array / null)
        let weekdays = r.recurrence_weekdays;
        if (weekdays == null) weekdays = [];
        else if (Array.isArray(weekdays)) weekdays = weekdays;
        else weekdays = String(weekdays).split(",").map(s => s.trim()).filter(Boolean);

        return {
          ...r,
          recurrence_weekdays: weekdays,
          assigned_to: assigned
        };
      });

      return { success: true, data };

    } catch (err) {
      if (typeof log === "function") log("TaskList.getAll ERR:", err);
      else console.error("TaskList.getAll ERR:", err);
      return { success: false, error: err.message || String(err) };
    }
  },


  // UPDATE a task template
  async update_(id, data) {
    try {
      const sql = `
        UPDATE tasks_list
        SET 
          title = ?, 
          description = ?, 
          priority = ?, 
          recurrence_type = ?, 
          recurrence_weekdays = ?, 
          once_date = ?, 
          updated_by = ?,
          is_active = ?
        WHERE id = ?
      `;

      const params = [
        data.title,
        data.description ?? null,
        data.priority ?? "low",
        data.recurrence_type ?? "daily",
        Array.isArray(data.recurrence_weekdays) ? data.recurrence_weekdays.join(",") : (data.recurrence_weekdays ?? null),
        data.once_date ?? null,
        data.updated_by ?? null,
        (data.is_active ?? 1),
        id
      ];

      const [result] = await pool.query(sql, params);

      if (result.affectedRows === 0) {
        return { success: false, error: "Not found or no change" };
      }

      return { success: true };

    } catch (err) {
      if (typeof log === "function") log("TaskList.update ERR:", err);
      else console.error("TaskList.update ERR:", err);
      return { success: false, error: err.message || String(err) };
    }
  },

  // Replace the existing update method in your TaskListModel with this one.
  // Assumes pool and log are already imported in the module:
  // import { pool, runMysql, readFileContent, log } from "../config/db.js";

  async update(id, data) {
    try {
      // Defensive copy
      const updates = { ...(data || {}) }; //log(updates);

      // helper lists
      const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
      const WEEKENDS = ['sat', 'sun'];

      // Normalize recurrence_type and recurrence_weekdays if present
      if ('recurrence_type' in updates) {
        let rt = (updates.recurrence_type || '').toString().toLowerCase().trim();

        if (rt === 'weekdays') {
          updates.recurrence_type = 'weekly';
          updates.recurrence_weekdays = WEEKDAYS.join(',');
        } else if (rt === 'weekends') {
          updates.recurrence_type = 'weekly';
          updates.recurrence_weekdays = WEEKENDS.join(',');
        } else if (rt === 'weekly') {
          updates.recurrence_type = 'weekly';
          if ('recurrence_weekdays' in updates) {
            if (Array.isArray(updates.recurrence_weekdays)) {
              updates.recurrence_weekdays = updates.recurrence_weekdays.join(',');
            } else if (!updates.recurrence_weekdays) {
              updates.recurrence_weekdays = null;
            } else {
              updates.recurrence_weekdays = updates.recurrence_weekdays.toString();
            }
          }
        } else if (rt === 'daily' || rt === 'once') {
          updates.recurrence_type = rt;
          // clear recurrence_weekdays for daily/once
          updates.recurrence_weekdays = null;
          if (rt === 'daily') updates.once_date = null;
        } else {
          // unexpected -> default to daily
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
        } else {
          updates.recurrence_weekdays = updates.recurrence_weekdays.toString();
        }
      }

      // Normalize once_date empty string -> null
      if ('once_date' in updates) {
        updates.once_date = (updates.once_date && String(updates.once_date).trim() !== '') ? updates.once_date : null;
        // updates.once_date =  updates.once_date;
      }

      // Normalize is_active to 1/0 if provided
      if ('is_active' in updates) {
        const v = updates.is_active;
        updates.is_active = (v === 1 || v === '1' || v === true || v === 'true') ? 1 : 0;
      }

      // Keep the exact SQL and params shape you want
      const sql = `
      UPDATE tasks_list
      SET 
        title = ?, 
        description = ?, 
        priority = ?, 
        recurrence_type = ?, 
        recurrence_weekdays = ?, 
        once_date = ?, 
        updated_by = ?,
        is_active = ?
      WHERE id = ?
    `;
      const params = [
        updates.title,
        updates.description ?? null,
        updates.priority ?? "low",
        updates.recurrence_type ?? "daily",
        Array.isArray(updates.recurrence_weekdays) ? updates.recurrence_weekdays.join(",") : (updates.recurrence_weekdays ?? null),
        updates.once_date ?? null,
        updates.updated_by ?? null,
        (updates.is_active ?? 1),
        id
      ];

      const [result] = await pool.query(sql, params);

      if (result.affectedRows === 0) {
        return { success: false, error: "Not found or no change" };
      }

      return { success: true };

    } catch (err) {
      if (typeof log === "function") log("TaskList.update ERR:", err);
      else console.error("TaskList.update ERR:", err);
      return { success: false, error: err.message || String(err) };
    }
  },

  // DELETE (hard delete)
  async delete(id) {
    try {
      const sql = "DELETE FROM tasks_list WHERE id = ?";
      const [result] = await pool.query(sql, [id]);

      if (result.affectedRows === 0) {
        return { success: false, error: "Not found" };
      }

      return { success: true };

    } catch (err) {
      if (typeof log === "function") log("TaskList.delete ERR:", err);
      else console.error("TaskList.delete ERR:", err);
      return { success: false, error: err.message || String(err) };
    }
  }

};

export default TaskListModel;
