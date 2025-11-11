import Task from '../models/taskModel.js'; // adjust the import path as needed

export async function handleCreateTask(req, res) {
    try {
        const { title, description, assigned_to } = req.body;
        // Assuming you get 'created_by' from the logged-in user's session
        const created_by = req.user.id;

        const newTaskData = {
            title,
            description,
            assigned_to,
            created_by,
            priority: 'high'
        };

        const task = await Task.create(newTaskData);
        res.status(201).json({ status: true, task });

    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}

// --- Example: Getting a single task ---
export async function handleGetTask(req, res) {
    try {
        const { taskId } = req.params;
        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(200).json(task);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

/**
 * Get tasks based on user role.
 *  - Admin/Manager: all tasks
 *  - User: only tasks assigned to them
 */
export const getTasksForUser = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const filters = {};

        // Non-admins (regular users) only see their own assigned tasks
        if (user.role !== 'admin' && user.role !== 'manager') {
            filters.assigned_to = user.id;
        }

        // Optional: Allow query filters (status, priority, etc.)
        const { status, priority, includeArchived } = req.query;
        if (status) filters.status = status;
        if (priority) filters.priority = priority;
        if (includeArchived) filters.includeArchived = includeArchived === 'true';

        const tasks = await Task.findAll(filters);

        res.status(200).json({
            success: true,
            role: user.role,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        console.error('Error fetching user tasks:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tasks',
            error: error.message
        });
    }
};

/**
 * Controller to handle fetching tasks with optional filters.
 * Supports query params such as:
 *   ?status=pending&assigned_to=3&includeArchived=true
 */
export const getAllTasks = async (req, res) => {
    try {
        // Extract filters from query parameters
        const {
            status,
            assigned_to,
            created_by,
            priority,
            includeArchived
        } = req.query;

        // Build filters object for the model
        const filters = {
            status,
            assigned_to: assigned_to ? Number(assigned_to) : undefined,
            created_by: created_by ? Number(created_by) : undefined,
            priority,
            includeArchived: includeArchived === 'true' // convert string to boolean
        };

        const tasks = await Task.findAll(filters);
        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tasks',
            error: error.message
        });
    }
};
