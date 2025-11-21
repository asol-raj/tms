// src/controllers/userTaskAssignment.controller.js
import UserTaskAssignmentModel from "../models/userTaskAssignment.model.js";

function sendSuccess(res, data = {}, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
function sendError(res, message = "Something went wrong", status = 500) {
  return res.status(status).json({ success: false, error: message });
}

const UserTaskAssignmentController = {

  // Create a new assignment
  async create(req, res) {
    try {
      const body = req.body ?? {};
      const required = ["task_list_id", "user_id"];
      for (const r of required) {
        if (!body[r]) return sendError(res, `${r} is required`, 400);
      }

      const payload = {
        task_list_id: Number(body.task_list_id),
        user_id: Number(body.user_id),
        assigned_by: body.assigned_by ? Number(body.assigned_by) : (req.user?.id ?? null),
        assigned_at: body.assigned_at ?? null,
        start_date: body.start_date ?? null,
        end_date: body.end_date ?? null,
        is_active: body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1
      };

      const result = await UserTaskAssignmentModel.create(payload);
      if (!result.success) return sendError(res, result.error || "Failed to create", 400);
      return sendSuccess(res, { id: result.id }, 201);

    } catch (err) {
      console.error("UserTaskAssignmentController.create ERR:", err);
      return sendError(res, err.message || String(err), 500);
    }
  },

  // Get one by id
  async getById(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id) return sendError(res, "invalid id", 400);
      const result = await UserTaskAssignmentModel.getById(id);
      if (!result.success) return sendError(res, result.error || "Not found", 404);
      return sendSuccess(res, { data: result.data });
    } catch (err) {
      console.error("UserTaskAssignmentController.getById ERR:", err);
      return sendError(res, err.message || String(err), 500);
    }
  },

  // Get all (with optional query filters)
  async getAll(req, res) {
    try {
      const q = req.query ?? {};
      const filters = {};
      if (q.user_id) filters.user_id = Number(q.user_id);
      if (q.task_list_id) filters.task_list_id = Number(q.task_list_id);
      if (q.assigned_by) filters.assigned_by = Number(q.assigned_by);
      if (q.is_active !== undefined) filters.is_active = (q.is_active === "1" || q.is_active === "true") ? 1 : 0;

      const result = await UserTaskAssignmentModel.getAll(filters);
      if (!result.success) return sendError(res, result.error || "Failed to fetch", 500);
      return sendSuccess(res, { data: result.data });
    } catch (err) {
      console.error("UserTaskAssignmentController.getAll ERR:", err);
      return sendError(res, err.message || String(err), 500);
    }
  },

  // Update by id (partial allowed)
  async update(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id) return sendError(res, "invalid id", 400);
      const body = req.body ?? {};

      const payload = {};
      const allowed = ["task_list_id", "user_id", "assigned_by", "assigned_at", "start_date", "end_date", "is_active"];
      for (const k of allowed) {
        if (body[k] !== undefined) payload[k] = body[k];
      }

      if (!Object.keys(payload).length) return sendError(res, "no fields to update", 400);
      const result = await UserTaskAssignmentModel.update(id, payload);
      if (!result.success) return sendError(res, result.error || "Failed to update", 400);
      return sendSuccess(res, {});
    } catch (err) {
      console.error("UserTaskAssignmentController.update ERR:", err);
      return sendError(res, err.message || String(err), 500);
    }
  },

  // Delete
  async remove(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id) return sendError(res, "invalid id", 400);
      const result = await UserTaskAssignmentModel.delete(id);
      if (!result.success) return sendError(res, result.error || "Failed to delete", 400);
      return sendSuccess(res, {});
    } catch (err) {
      console.error("UserTaskAssignmentController.remove ERR:", err);
      return sendError(res, err.message || String(err), 500);
    }
  }

};

export default UserTaskAssignmentController;
