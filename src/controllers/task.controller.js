import Task from '../models/task.model.js';

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
        res.status(201).json(task);

    } catch (error) {
        res.status(500).json({ message: error.message });
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

