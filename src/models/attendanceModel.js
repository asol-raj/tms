// src/models/attendanceModel.js
import { pool } from '../config/db.js'; // if you export default, use: import pool from '../configs/db.js';

export async function upsertCheckIn(userId) {
  const sql = `
    INSERT INTO attendance (user_id, attendance_date, status, check_in)
    VALUES (?, CURDATE(), 'present', UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE
      check_in = COALESCE(check_in, VALUES(check_in)),
      status = 'present',
      updated_at = CURRENT_TIMESTAMP;
  `;
  const [res] = await pool.execute(sql, [userId]);
  return res;
}

export async function setCheckOut(userId) {
  const sql = `
    UPDATE attendance
    SET check_out = UTC_TIMESTAMP(), updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND attendance_date = CURDATE();
  `;
  const [res] = await pool.execute(sql, [userId]);
  return res;
}

export async function markStatusForDate(userId, date, status, note = null) {
  const sql = `
    INSERT INTO attendance (user_id, attendance_date, status, note)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      note = VALUES(note),
      check_in = NULL,
      check_out = NULL,
      updated_at = CURRENT_TIMESTAMP;
  `;
  const [res] = await pool.execute(sql, [userId, date, status, note]);
  return res;
}

export async function getAttendanceForDate(date) {
  const sql = `
    SELECT u.id, u.user_id, u.fullname, u.username,
           COALESCE(a.status, 'absent') AS status,
           a.check_in, a.check_out, a.note
    FROM users u
    LEFT JOIN attendance a
      ON a.user_id = u.user_id AND a.attendance_date = ?
    ORDER BY FIELD(COALESCE(a.status,'absent'),'present','leave','holiday','absent') , u.fullname;
  `;
  const [rows] = await pool.execute(sql, [date]);
  return rows;
}

export async function getPresentUsersOnDate(date) {
  const sql = `
    SELECT u.id, u.user_id, u.fullname, u.username, a.check_in, a.check_out
    FROM users u
    JOIN attendance a ON a.user_id = u.user_id
    WHERE a.attendance_date = ? AND a.status = 'present'
    ORDER BY u.fullname;
  `;
  const [rows] = await pool.execute(sql, [date]);
  return rows;
}

export async function getAttendanceRange(fromDate, toDate) {
  const sql = `
    SELECT a.attendance_date, u.user_id, u.fullname, a.status, a.check_in, a.check_out, a.note
    FROM attendance a
    JOIN users u ON u.user_id = a.user_id
    WHERE a.attendance_date BETWEEN ? AND ?
    ORDER BY a.attendance_date DESC, u.fullname;
  `;
  const [rows] = await pool.execute(sql, [fromDate, toDate]);
  return rows;
}

export async function getPresentCount(date) {
  const sql = `SELECT COUNT(*) AS present_count FROM attendance WHERE attendance_date = ? AND status = 'present'`;
  const [rows] = await pool.execute(sql, [date]);
  return rows?.[0]?.present_count ?? 0;
}

export async function getAllUsersCount() {
  const sql = `SELECT COUNT(*) AS total_users FROM users`;
  const [rows] = await pool.execute(sql);
  return rows?.[0]?.total_users ?? 0;
}

export async function getAttendanceForMonth(yearMonth) {
  const sql = `
        SELECT 
            u.user_id,
            DAY(a.attendance_date) AS day,
            a.status
        FROM users u
        LEFT JOIN attendance a
            ON a.user_id = u.user_id
           AND DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
        WHERE u.is_active = 1
        ORDER BY u.fullname;
    `;
  const [rows] = await pool.execute(sql, [yearMonth]);
  return rows;
}

export async function allUsers() {
  const sql = `
      SELECT 
        id, 
        user_id, 
        fullname, 
        username, 
        email 
      FROM users 
      WHERE user_role = 'user' 
      ORDER BY fullname;
    `;
  const [rows] = await pool.execute(sql);
  return rows;
}

