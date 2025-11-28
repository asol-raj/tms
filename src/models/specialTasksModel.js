// src/models/specialTasksModel.js
// Models for special_tasks, special_task_correspondence, special_task_attachments
// Uses exported `pool` from src/config/db.js
// NOTE: pool should support promise-style `.query(...)` (mysql2/promise). If not, use pool.promise().query(...).

import { pool } from '../config/db.js';

const query = async (sql, params = []) => {
  // If your pool is not promise-enabled, change to: return (await pool.promise().query(sql, params))[0];
  const [rows] = await pool.query(sql, params);
  return rows;
};

export const SpecialTasksModel = {
  async createTask({ task_name, description, status, priority, category, created_by, assigned_to }) {
    const sql = `
      INSERT INTO special_tasks
        (task_name, description, status, priority, category, created_by, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [task_name, description, status, priority, category, created_by, assigned_to]);
    return { insertId: result.insertId, affectedRows: result.affectedRows, result };
  },

  async getTaskById(id) {
    const sql = `
    SELECT 
      st.*,
      cb.fullname AS createdby_name,
      at.fullname AS assignedto_name
    FROM special_tasks st
      JOIN users cb ON cb.id = st.created_by
      LEFT JOIN users at ON at.id = st.assigned_to
    WHERE st.id = ?
  `;
    const rows = await query(sql, [id]);
    return rows[0] || null;
  },

  async listTasks_({ limit = 25, offset = 0, status, assigned_to, created_by }) {
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (assigned_to) {
      conditions.push('assigned_to = ?');
      params.push(assigned_to);
    }
    if (created_by) {
      conditions.push('created_by = ?');
      params.push(created_by);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM special_tasks ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit));
    params.push(Number(offset));

    const rows = await query(sql, params);
    return rows;
  },

  async listTasks({ limit = 25, offset = 0, status, assigned_to, created_by }) {
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('t.status = ?');
      params.push(status);
    }
    if (assigned_to) {
      conditions.push('t.assigned_to = ?');
      params.push(assigned_to);
    }
    if (created_by) {
      conditions.push('t.created_by = ?');
      params.push(created_by);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
        SELECT 
          t.id, t.task_name, t.description, t.priority, t.status, t.category, 
          u1.fullname as created_by, u2.fullname as assigned_to,
          date_format(t.created_at, '%m-%d-%Y, %r') as created_at
        FROM special_tasks t
        LEFT JOIN users u1 ON u1.id = t.created_by
        LEFT JOIN users u2 ON u2.id = t.assigned_to
        ${where}
        ORDER BY t.created_at DESC
        LIMIT ? OFFSET ?
      `;

    params.push(Number(limit));
    params.push(Number(offset));

    return await query(sql, params);
  },


  async updateTask(id, fields = {}) {
    const keys = Object.keys(fields);
    if (!keys.length) return { affectedRows: 0 };

    const assignments = keys.map(k => `\`${k}\` = ?`).join(', ');
    const params = keys.map(k => fields[k]);
    params.push(id);

    const sql = `UPDATE special_tasks SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const result = await query(sql, params);
    return result;
  },

  async deleteTask(id) {
    // This does a hard delete. For soft-delete, change to update status or add deleted_at field.
    const sql = `DELETE FROM special_tasks WHERE id = ?`;
    const result = await query(sql, [id]);
    return result;
  }
};

export const CorrespondenceModel = {
  async create({ task_id, sender_id, message, is_internal = 0 }) {
    const sql = `
      INSERT INTO special_task_correspondence
        (task_id, sender_id, message, is_internal)
      VALUES (?, ?, ?, ?)
    `;
    const result = await query(sql, [task_id, sender_id, message, is_internal]);
    return { insertId: result.insertId };
  },

  async listByTask(task_id) {
    const sql = `
    SELECT 
      stc.id,
      stc.task_id,
      stc.sender_id,
      stc.message,
      stc.is_internal,
      stc.created_at,
      u.fullname AS sender_name
    FROM special_task_correspondence stc
    JOIN users u ON u.id = stc.sender_id
    WHERE stc.task_id = ?
    ORDER BY stc.created_at ASC
  `;
    return await query(sql, [task_id]);
  },
  // still inside CorrespondenceModel
  async getById(id) {
    const sql = `
    SELECT 
      stc.id,
      stc.task_id,
      stc.sender_id,
      stc.message,
      stc.is_internal,
      stc.created_at,
      u.fullname AS sender_name
    FROM special_task_correspondence stc
    JOIN users u ON u.id = stc.sender_id
    WHERE stc.id = ?
    LIMIT 1
  `;
    const rows = await query(sql, [id]);
    return rows[0] || null;
  },

  async updateById(id, { message, is_internal = null }) {
    const fields = [];
    const params = [];

    if (typeof message === 'string') {
      fields.push('message = ?');
      params.push(message);
    }
    if (is_internal !== null && is_internal !== undefined) {
      fields.push('is_internal = ?');
      params.push(is_internal ? 1 : 0);
    }

    if (!fields.length) return { affectedRows: 0 };

    params.push(id);
    const sql = `
    UPDATE special_task_correspondence 
    SET ${fields.join(', ')}
    WHERE id = ?
  `;
    return await query(sql, params);
  },

  // Delete a correspondence record by ID
  async deleteById(id) {
    const sql = `DELETE FROM special_task_correspondence WHERE id = ?`;
    return await query(sql, [id]);
  },


};

export const AttachmentsModel = {
  async create({ task_id = null, correspondence_id = null, uploaded_by, file_name, file_path, mime_type, file_size }) {
    const sql = `
      INSERT INTO special_task_attachments
        (task_id, correspondence_id, uploaded_by, file_name, file_path, mime_type, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [task_id, correspondence_id, uploaded_by, file_name, file_path, mime_type, file_size]);
    return { insertId: result.insertId };
  },

  async listByTask(task_id) {
    const sql = `
      SELECT * FROM special_task_attachments WHERE task_id = ? ORDER BY created_at ASC
    `;
    return await query(sql, [task_id]);
  },

  async listByCorrespondenceIds(corrIds = []) {
    if (!corrIds.length) return [];
    const placeholders = corrIds.map(() => '?').join(', ');
    const sql = `SELECT * FROM special_task_attachments WHERE correspondence_id IN (${placeholders}) ORDER BY created_at ASC`;
    return await query(sql, corrIds);
  },

  async deleteById(id) {
    const sql = `DELETE FROM special_task_attachments WHERE id = ?`;
    return await query(sql, [id]);
  },

  async getById(id) {
    const sql = `SELECT * FROM special_task_attachments WHERE id = ? LIMIT 1`;
    const rows = await query(sql, [id]);
    return rows[0] || null;
  },

  // --- inside AttachmentsModel ---
  async updateById(id, fields = {}) {
    const keys = Object.keys(fields);
    if (!keys.length) return { affectedRows: 0 };

    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
    const params = keys.map(k => fields[k]);
    params.push(id);

    const sql = `UPDATE special_task_attachments SET ${setClause} WHERE id = ?`;
    return await query(sql, params);
  },

};
