// src/controller/taskList.controller.js
// ESM controller for TaskListModel
// Usage: import TaskListController from "../controller/taskList.controller.js"
// Attach handlers to routes e.g. router.post("/", TaskListController.create)

import { log } from "console";
import TaskListModel from "../models/taskList.model.js";

/**
 * Small helper - send consistent responses
 */
function sendSuccess(res, data = {}, status = 200) {
  return res.status(status).json({ success: true, ...data });
}

function sendError(res, message = "Something went wrong", status = 500) {
  return res.status(status).json({ success: false, error: message });
}

const TaskListController = {

  /**
   * Create new tasks_list entry
   * Expects JSON body:
   * { title, description, priority, recurrence_type, recurrence_weekdays (array), once_date, created_by, is_active }
   */
  async create(req, res) {
    try {
      const body = req.body ?? {};

      if (!body.title || String(body.title).trim() === "") {
        return sendError(res, "title is required", 400);
      }

      // Normalize recurrence_weekdays to array if provided as CSV or string by client
      let recurrence_weekdays = body.recurrence_weekdays ?? null;
      if (typeof recurrence_weekdays === "string") {
        recurrence_weekdays = recurrence_weekdays.split(",").map(s => s.trim()).filter(Boolean);
      }
      if (!Array.isArray(recurrence_weekdays)) recurrence_weekdays = null;

      const payload = {
        title: String(body.title).trim(),
        description: body.description ?? null,
        priority: body.priority ?? "low",
        recurrence_type: body.recurrence_type ?? "daily",
        recurrence_weekdays,
        once_date: body.once_date ?? null,
        created_by: body.created_by ?? req.user.id,
        is_active: body.is_active ?? 1
      };

      const result = await TaskListModel.create(payload);
      if (!result.success) return sendError(res, result.error || "Failed to create", 500);

      return sendSuccess(res, { id: result.id }, 201);

    } catch (err) {
      console.error("TaskListController.create ERR:", err);
      return sendError(res, err.message || String(err), 500);
    }
  },

  /**
   * Get single template by ID
   * Route param: :id
   */
  async getById(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) return sendError(res, "invalid id", 400);

      const result = await TaskListModel.getById(id);
      if (!result.success) return sendError(res, result.error || "Not found", 404);

      return sendSuccess(res, { data: result.data }, 200);

    } catch (err) {
      console.error("TaskListController.getById ERR:", err);
      return sendError(res, err.message || String(err), 500);
    }
  },

  /**
   * Get all templates with optional filters via query string:
   * ?is_active=1&created_by=12&recurrence_type=daily
   */
  async getAll(req, res) {
    try {
      const q = req.query ?? {};
      const filters = {};

      if (q.is_active !== undefined) {
        // accept "1"/"0" or true/false
        filters.is_active = (q.is_active === "1" || q.is_active === "true" || q.is_active === 1 || q.is_active === true) ? 1 : 0;
      }

      if (q.created_by) {
        const cb = Number(q.created_by);
        if (!Number.isNaN(cb)) filters.created_by = cb;
      }

      if (q.recurrence_type) {
        filters.recurrence_type = String(q.recurrence_type);
      }

      const result = await TaskListModel.getAll(filters);
      if (!result.success) return sendError(res, result.error || "Failed to fetch", 500);

      return sendSuccess(res, { data: result.data }, 200);

    } catch (err) {
      console.error("TaskListController.getAll ERR:", err);
      return sendError(res, err.message || String(err), 500);
    }
  },

  /**
   * Update a template
   * Route param: :id
   * Body: same shape as create
   */
  async update(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) return sendError(res, "invalid id", 400);

      const body = req.body ?? {};
      if (body.title !== undefined && String(body.title).trim() === "") {
        return sendError(res, "title cannot be empty", 400);
      }

      let recurrence_weekdays = body.recurrence_weekdays ?? null;
      if (typeof recurrence_weekdays === "string") {
        recurrence_weekdays = recurrence_weekdays.split(",").map(s => s.trim()).filter(Boolean);
      }
      if (!Array.isArray(recurrence_weekdays)) recurrence_weekdays = null;

      const payload = {
        title: body.title ?? undefined,
        description: body.description ?? null,
        priority: body.priority ?? "low",
        recurrence_type: body.recurrence_type ?? "daily",
        recurrence_weekdays,
        updated_by: req.user.id || null,
        once_date: body.once_date ?? null,
        is_active: body.is_active ?? 1
      }; //log(payload);

      // Note: model.update expects full set of fields; ensure required fields are provided by client.
      const result = await TaskListModel.update(id, payload);
      if (!result.success) {
        const status = result.error && result.error.toLowerCase().includes("not found") ? 404 : 400;
        return sendError(res, result.error || "Failed to update", status);
      }

      return sendSuccess(res, {}, 200);

    } catch (err) {
      console.error("TaskListController.update ERR:", err);
      return sendError(res, err.message || String(err), 500);
    }
  },

  /**
   * Delete a template (hard delete)
   * Route param: :id
   */
  async remove(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) return sendError(res, "invalid id", 400);

      const result = await TaskListModel.delete(id);
      if (!result.success) {
        const status = result.error && result.error.toLowerCase().includes("not found") ? 404 : 400;
        return sendError(res, result.error || "Failed to delete", status);
      }

      return sendSuccess(res, {}, 200);

    } catch (err) {
      console.error("TaskListController.remove ERR:", err);
      return sendError(res, err.message || String(err), 500);
    }
  }

};

export default TaskListController;
