// src/models/usersDailyTaskRemarks.model.js
// ESM (type: "module")
// Requires src/config/db.js to export: { pool, log }

import { pool, log } from "../config/db.js";

const UsersDailyTaskRemarksModel = {

  /**
   * Insert or update a remark/comment for a given task/user/date.
   * Expects an object:
   * {
   *   task_list_id: number,
   *   user_id: number,
   *   for_date: 'YYYY-MM-DD',
   *   remark?: string | null,
   *   comment?: string | null,
   *   comment_by?: number | null
   * }
   *
   * Requires a UNIQUE KEY on (task_list_id, user_id, for_date)
   * in users_daily_task_remarks.
   */
  async upsert({ task_list_id, user_id, for_date, remarks = null, comments = null, comment_by = null }) {
    try {
      const sql = `
        INSERT INTO users_daily_task_remarks
          (task_list_id, user_id, for_date, remarks, comments, comment_by)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          remarks = COALESCE(VALUES(remarks), remarks),
          comments = COALESCE(VALUES(comments), comments),
          comment_by = CASE 
            WHEN VALUES(comments) IS NOT NULL THEN VALUES(comment_by)
            ELSE comment_by
          END
      `;

      const params = [
        task_list_id,
        user_id,
        for_date,
        remarks,
        comments,
        comment_by
      ];

      await pool.query(sql, params);
      return { success: true };

    } catch (err) {
      if (typeof log === "function") log("UsersDailyTaskRemarksModel.upsert ERR:", err);
      else console.error("UsersDailyTaskRemarksModel.upsert ERR:", err);
      return { success: false, error: err.message || String(err) };
    }
  },

  /**
   * Optional helper – get remarks for one task/user/date
   */
  async getOne({ task_list_id, user_id, for_date }) {
    try {
      const sql = `
        SELECT *
        FROM users_daily_task_remarks
        WHERE task_list_id = ? AND user_id = ? AND for_date = ?
        LIMIT 1
      `;
      const [rows] = await pool.query(sql, [task_list_id, user_id, for_date]);
      if (!rows.length) return { success: false, error: "Not found" };
      return { success: true, data: rows[0] };
    } catch (err) {
      if (typeof log === "function") log("UsersDailyTaskRemarksModel.getOne ERR:", err);
      else console.error("UsersDailyTaskRemarksModel.getOne ERR:", err);
      return { success: false, error: err.message || String(err) };
    }
  }

};

export default UsersDailyTaskRemarksModel;
