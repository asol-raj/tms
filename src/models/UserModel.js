// /models/UserModel.js
import { log, pool } from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const saltRounds = 10; // Standard for bcrypt hashing

class User {

  /**
   * Creates a new user and their associated profile in a transaction.
   * @param {object} userData - An object containing { email, password, username, firstName, lastName }
   * @returns {object} - The newly created user's ID and email.
   * @throws {Error} - If the email or username already exists, or on database error.
   */
  static async create(userData) {
    const { email, password, username, fullname, userrole = 'user' } = userData;

    // 1. Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 2. Start a database transaction
    // We MUST use a transaction because we're writing to two tables.
    // If the 'user_profile' insert fails, we must roll back the 'users' insert.
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // 3. Insert into 'users' table
      const userSql = `
        INSERT INTO users 
          (email, password_hash, username, fullname, user_role) 
        VALUES (?, ?, ?, ?, ?)
      `;
      const [userResult] = await connection.query(userSql, [
        email,
        hashedPassword,
        username,
        fullname,
        userrole
      ]);

      const newUserId = userResult.insertId;

      // 4. Insert into 'user_profile' table
      const profileSql = 'INSERT INTO user_profile (user_id) VALUES (?)';
      await connection.query(profileSql, [newUserId]);

      // 5. If both inserts succeed, commit the transaction
      await connection.commit();

      return { id: newUserId, email: email };

    } catch (error) {
      // 6. If anything fails, roll back the transaction
      if (connection) {
        await connection.rollback();
      }

      // Handle specific errors (like duplicate email/username)
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('An account with this email or username already exists.');
      }

      // Throw a generic error for other issues
      throw new Error(`Error creating user: ${error.message}`);

    } finally {
      // 7. ALWAYS release the connection back to the pool
      if (connection) {
        connection.release();
      }
    }
  }

  // ... (You would add other methods here like findByEmail, findById, update, etc.)

  /**
   * Finds a user by their email. (Example for login)
   * @param {string} email
   * @returns {object|null} The user row or null if not found.
   */
  static async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? OR username=?', [email, email]);
    return rows[0] || null;
  }

  /**
   * Authenticates a user and generates a JWT.
   * @param {string} email - The user's email.
   * @param {string} password - The user's plain-text password.
   * @returns {string} - The generated JSON Web Token.
   * @throws {Error} - If email not found or password incorrect.
   */
  static async login(email, password) {
    // 1. Find the user by email
    const userSql = 'SELECT * FROM users WHERE (username=? OR email = ?) AND is_active = 1';
    const [rows] = await pool.query(userSql, [email, email]);
    const user = rows[0]; //log(user);

    if (!user) {
      throw new Error('Invalid email or password.');
    }

    // 2. Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    // 3. Create JWT Payload
    // This is the data we want to store in the token
    const payload = {
      user: {
        id: user.id,
        role: user.user_role,
        email: user.email,
        fullname: user.fullname,
        user_id: user.user_id,
      }
    };

    // 4. Sign the token
    // It will expire in 30 days, as you requested.
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET, // Your secret from the .env file
      { expiresIn: '30d' }
    );
    // log(token);
    return token;
  }

  /**
 * Admin: force-set a user's password (no token).
 * - Verifies the caller is an admin (basic check using users.is_admin flag).
 * - Hashes the new password and updates the user's row.
 * - Optionally writes an audit record (or updates password_changed_by / password_changed_at).
 *
 * @param {number} adminId - id of the user whose password will be changed
 * @param {number} userid - id of the user whose password will be changed
 * @param {string} newPassword - plaintext new password
 * @returns {Promise<{id: number, changed: boolean}>}
 * @throws {Error} if caller is not admin or DB error
 */
  static async resetPassword(adminId, userid, newPassword) {
    // 1. check admin privileges
    const [adminRows] = await pool.query('SELECT id, user_role FROM users WHERE id = ? LIMIT 1', [adminId]);
    const admin = adminRows[0];
    if (!admin || !admin.id) {
      throw new Error('Permission denied: caller is not an admin.');
    }

    const hashed = await bcrypt.hash(newPassword, saltRounds);
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();
      await conn.query(
        `UPDATE users
         SET password_hash = ? WHERE id = ?`,
        [hashed, userid]
      );

      await conn.commit();
      return { id: userid, changed: true };
    } catch (error) {
      if (conn) await conn.rollback();
      throw new Error('Error resetting password: ' + err.message);
    } finally {
      if (conn) conn.release();
    }
  }


  /**
 * User: change own password (must provide current password).
 *
 * @param {number} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<{id:number}>}
 * @throws {Error} if current password wrong or DB error
 */
  static async changePassword(userId, currentPassword, newPassword) {

    const [rows] = await pool.query('SELECT id, password_hash FROM users WHERE id = ? LIMIT 1', [userId]);
    const user = rows[0];
    if (!user) throw new Error('User not found.');

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) throw new Error('Current password is incorrect.');

    const newHashed = await bcrypt.hash(newPassword, saltRounds);
    await pool.query(
      `UPDATE users
     SET password_hash = ? WHERE id = ?`,
      [newHashed, userId]
    );

    return { id: userId };
  }

}

export default User;