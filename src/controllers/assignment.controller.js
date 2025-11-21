// src/controllers/assignment.controller.js
import { assignTaskToUsers, removeAssignment } from "../services/assignmentService.js";

function sendSuccess(res, data = {}, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
function sendError(res, message = "Something went wrong", status = 500) {
  return res.status(status).json({ success: false, error: message });
}

const AssignmentController = {

  /**
   * Generic assign endpoint
   * POST /assignments/assign
   * Body: {
   *   taskListId: number (required),
   *   assignedBy: number (optional),
   *   userFilter: { is_active:1, user_role:'user', id_list: [1,2] } OR string SQL fragment (not recommended),
   *   createTodayCompletions: boolean (optional, default false)
   * }
   */
  async assignToUsers(req, res) {
    try {
      const body = req.body ?? {};
      const taskListId = Number(body.taskListId ?? body.task_list_id);
      if (!taskListId || Number.isNaN(taskListId)) {
        return sendError(res, "taskListId is required and must be a number", 400);
      }

      const options = {
        assignedBy: body.assignedBy ?? body.assigned_by ?? (req.user?.id ?? null),
        userFilter: body.userFilter ?? { is_active: 1, user_role: "user" },
        createTodayCompletions: !!body.createTodayCompletions
      };

      const result = await assignTaskToUsers(taskListId, options);
      if (!result.success) return sendError(res, result.error || "Failed to assign", 500);
      return sendSuccess(res, { message: "Assigned successfully" }, 200);
    } catch (err) {
      console.error("AssignmentController.assignToUsers ERR:", err);
      return sendError(res, err.message || String(err), 500);
    }
  },

  /**
   * Convenience endpoint: assign to all active regular users (is_active=1 AND user_role='user')
   * POST /assignments/assign-to-all-active
   * Body: { taskListId: number, assignedBy?: number, createTodayCompletions?: boolean }
   */
  async assignToAllActiveUsers(req, res) {
    try {
      const body = req.body ?? {};
      const taskListId = Number(body.taskListId ?? body.task_list_id);
      if (!taskListId || Number.isNaN(taskListId)) {
        return sendError(res, "taskListId is required and must be a number", 400);
      }

      const options = {
        assignedBy: body.assignedBy ?? body.assigned_by ?? (req.user?.id ?? null),
        userFilter: { is_active: 1, user_role: "user" },
        createTodayCompletions: !!body.createTodayCompletions
      };

      const result = await assignTaskToUsers(taskListId, options);
      if (!result.success) return sendError(res, result.error || "Failed to assign", 500);
      return sendSuccess(res, { message: "Assigned to all active users (user_role='user')" }, 200);
    } catch (err) {
      console.error("AssignmentController.assignToAllActiveUsers ERR:", err);
      return sendError(res, err.message || String(err), 500);
    }
  },

  /**
   * Remove assignment(s)
   * POST /assignments/remove
   * Body: { taskListId: number (required), userId?: number, removeCompletions?: boolean }
   * If userId is present, removes assignment for that user. Otherwise removes for all users.
   */
  async removeAssignment_(req, res) {
    try {
      const body = req.body ?? {};
      const taskListId = Number(body.taskListId ?? body.task_list_id);
      if (!taskListId || Number.isNaN(taskListId)) {
        return sendError(res, "taskListId is required and must be a number", 400);
      }
      const userId = body.userId !== undefined ? (Number(body.userId) || null) : null;
      const removeCompletions = !!body.removeCompletions;

      const result = await removeAssignment(taskListId, { userId, removeCompletions });
      if (!result.success) return sendError(res, result.error || "Failed to remove assignment", 400);
      return sendSuccess(res, { message: "Assignment(s) removed" }, 200);
    } catch (err) {
      console.error("AssignmentController.removeAssignment ERR:", err);
      return sendError(res, err.message || String(err), 500);
    }
  },

  async removeAssignment(req, res) {
  try {
    const body = req.body ?? {};
    const taskListId = Number(body.taskListId ?? body.task_list_id);

    if (!taskListId || Number.isNaN(taskListId)) {
      return sendError(res, "taskListId is required and must be a number", 400);
    }

    const removeCompletions = !!body.removeCompletions;

    // support both: userId and userIdList
    let userList = [];

    if (Array.isArray(body.userIdList)) {
      // convert to numbers
      userList = body.userIdList
        .map(u => Number(u))
        .filter(u => !Number.isNaN(u));
    } 
    else if (body.userId !== undefined) {
      const single = Number(body.userId);
      if (!Number.isNaN(single)) userList.push(single);
    }

    // CASE 1: remove for specific users
    if (userList.length > 0) {
      const results = [];

      for (const uid of userList) {
        const result = await removeAssignment(taskListId, { userId: uid, removeCompletions });
        results.push({ userId: uid, success: result.success, error: result.error });
      }

      return sendSuccess(res, { message: "Selected users unassigned", results }, 200);
    }

    // CASE 2: remove for ALL users
    const result = await removeAssignment(taskListId, { userId: null, removeCompletions });
    if (!result.success) return sendError(res, result.error || "Failed to remove", 400);

    return sendSuccess(res, { message: "Assignment removed for all users" }, 200);

  } catch (err) {
    console.error("AssignmentController.removeAssignment ERR:", err);
    return sendError(res, err.message || String(err), 500);
  }
}


};

export default AssignmentController;
