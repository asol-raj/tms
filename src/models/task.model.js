/**
 * Task Model (ESM Version)
 *
 * This module exports an object with methods to perform CRUD operations
 * on the 'tasks' table in the database.
 * It uses the database connection pool from '../config/db.js'.
 */

// Adjust the path '../config/db.js' as needed based on your file structure.
// NOTE: With ESM, you often need the full file extension '.js'
import { pool } from '../config/db.js';

const Task = {
    /**
     * Creates a new task in the database.
     * The `task_id` (UUID) is generated automatically by the database.
     *
     * @param {object} taskData - The data for the new task.
     * @param {string} taskData.title - The title of the task.
     * @param {number} taskData.created_by - The ID of the user creating the task.
     * @param {number} taskData.assigned_to - The ID of the user assigned to the task.
     * @param {string} [taskData.description] - (Optional) The task description.
     * @param {string} [taskData.priority='medium'] - (Optional) 'low', 'medium', or 'high'.
     * @param {string} [taskData.status='pending'] - (Optional) 'pending', 'in_progress', etc.
     * @param {string} [taskData.remarks] - (Optional) Any remarks.
     * @returns {Promise<object>} The newly created task object (fetched from DB).
     */
    async create(taskData) {
        const {
            title,
            created_by,
            assigned_to,
            description = null,
            priority = 'medium',
            status = 'pending',
            remarks = null
        } = taskData;

        // Check for required fields
        if (!title || !created_by || !assigned_to) {
            throw new Error('Missing required fields: title, created_by, and assigned_to are required.');
        }

        const sql = `
            INSERT INTO tasks 
                (title, description, priority, status, created_by, assigned_to)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const params = [title, description, priority, status, created_by, assigned_to];

        try {
            const [result] = await pool.query(sql, params);
            const insertId = result.insertId;

            // Fetch and return the newly created task (which now has the DB-generated task_id)
            return await this.findByDbId(insertId);
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    },

    /**
     * Finds a single task by its public `task_id` (UUID).
     *
     * @param {string} taskId - The UUID (task_id) of the task.
     * @returns {Promise<object|null>} The task object or null if not found.
     */
    async findById(taskId) {
        const sql = 'SELECT * FROM tasks WHERE task_id = ?';
        try {
            const [rows] = await pool.query(sql, [taskId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding task by ID:', error);
            throw error;
        }
    },

    /**
     * (Internal helper) Finds a single task by its auto-increment `id`.
     *
     * @param {number} dbId - The auto-increment (id) of the task.
     * @returns {Promise<object|null>} The task object or null if not found.
     */
    async findByDbId(dbId) {
        const sql = 'SELECT * FROM tasks WHERE id = ?';
        try {
            const [rows] = await pool.query(sql, [dbId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding task by DB ID:', error);
            throw error;
        }
    },

    /**
     * Finds all tasks, with optional filters.
     * By default, it excludes 'archived' tasks unless a specific status
     * is requested or `includeArchived` is set to true.
     *
     * @param {object} [filters={}] - Optional filters.
     * @param {string} [filters.status] - Filter by status (e.g., 'pending', 'completed').
     * @param {number} [filters.assigned_to] - Filter by assigned user ID.
     * @param {number} [filters.created_by] - Filter by creator user ID.
     * @param {string} [filters.priority] - Filter by priority.
     * @param {boolean} [filters.includeArchived=false] - Set to true to include archived tasks.
     * @returns {Promise<Array<object>>} An array of task objects.
     */
    async findAll(filters = {}) {
        let sql = 'SELECT * FROM tasks';
        const params = [];
        const conditions = [];

        // Add filters
        if (filters.assigned_to) {
            conditions.push('assigned_to = ?');
            params.push(filters.assigned_to);
        }
        if (filters.created_by) {
            conditions.push('created_by = ?');
            params.push(filters.created_by);
        }
        if (filters.priority) {
            conditions.push('priority = ?');
            params.push(filters.priority);
        }

        // Handle status filtering
        if (filters.status) {
            // If a specific status is requested, use it
            conditions.push('status = ?');
            params.push(filters.status);
        } else if (!filters.includeArchived) {
            // Default behavior: exclude archived tasks
            conditions.push("status != 'archived'");
        }
        // If filters.includeArchived is true and no status is set, no status condition is added.

        // Build the WHERE clause
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        // Add default sorting
        sql += ' ORDER BY created_at DESC';

        try {
            const [rows] = await pool.query(sql, params);
            return rows;
        } catch (error) {
            console.error('Error finding all tasks:', error);
            throw error;
        }
    },

    /**
     * Updates a task by its public `task_id` (UUID).
     *
     * @param {string} taskId - The UUID of the task to update.
     * @param {object} updateData - An object with the fields to update.
     * @param {string} [updateData.title] - New title.
     * @param {string} [updateData.description] - New description.
     *...
     * @param {number} [updateData.assigned_to] - New assignee ID.
     * @returns {Promise<object|null>} The updated task object or null if not found.
     */
    async update(taskId, updateData) {
        // Fields that are allowed to be updated
        const allowedUpdates = [
            'title', 'description', 'priority', 'status', 'remarks', 'assigned_to'
        ];

        const fieldsToUpdate = [];
        const values = [];

        // Dynamically build the SET part of the query
        for (const key of Object.keys(updateData)) {
            if (allowedUpdates.includes(key)) {
                fieldsToUpdate.push(`\`${key}\` = ?`);
                values.push(updateData[key]);
            }
        }

        if (fieldsToUpdate.length === 0) {
            // No valid fields to update, just return the task as-is
            return await this.findById(taskId);
        }

        // Add the taskId for the WHERE clause
        values.push(taskId);

        const sql = `UPDATE tasks SET ${fieldsToUpdate.join(', ')} WHERE task_id = ?`;

        try {
            const [result] = await pool.query(sql, values);

            if (result.affectedRows === 0) {
                return null; // Task not found
            }

            // Fetch and return the updated task
            return await this.findById(taskId);
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    },

    /**
     * Archives a task by setting its status to 'archived'.
     * This is a specific shortcut for the update() method.
     *
     * @param {string} taskId - The UUID of the task to archive.
     * @returns {Promise<object|null>} The archived task object or null if not found.
     */
    async archive(taskId) {
        const updateData = { status: 'archived' };
        return await this.update(taskId, updateData);
    },

    /**
     * Deletes a task from the database by its `task_id`.
     * This is a hard delete. Use archive() for a soft delete.
     *
     * @param {string} taskId - The UUID of the task to delete.
     * @returns {Promise<boolean>} True if the task was deleted, false if not found.
     *
     */
    async remove(taskId) {
        const sql = 'DELETE FROM tasks WHERE task_id = ?';
        try {
            const [result] = await pool.query(sql, [taskId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error removing task:', error);
            throw error;
        }
    }
};

// Use 'export default' for ES Modules
export default Task;