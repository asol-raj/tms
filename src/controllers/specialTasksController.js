// src/controllers/specialTasksController.js
// Controllers for routes. Assumes req.user.id exists (authenticated user).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { SpecialTasksModel, CorrespondenceModel, AttachmentsModel } from '../models/specialTasksModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path where multer stores files (same as router's multer config)
const UPLOAD_DIR = path.join(process.cwd(), 'src', 'uploads', 'special_tasks');

const ensureUploadDir = () => {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
};

/**
 * Create a task. Supports files in req.files (array).
 * Expects: req.body.task_name, description, priority, category, assigned_to (optional)
 */
export const createTask = async (req, res, next) => {
  try {
    const creatorId = req.user?.id;
    if (!creatorId) return res.status(401).json({ error: 'Unauthorized' });

    const { task_name, description = null, priority = 'medium', category = null, assigned_to = null } = req.body;

    if (!task_name) return res.status(400).json({ error: 'task_name is required' });

    const { insertId } = await SpecialTasksModel.createTask({
      task_name,
      description,
      status: 'open',
      priority,
      category,
      created_by: creatorId,
      assigned_to: assigned_to || null
    });

    // handle any uploaded files (req.files from multer)
    if (req.files && req.files.length) {
      ensureUploadDir();
      for (const f of req.files) {
        await AttachmentsModel.create({
          task_id: insertId,
          correspondence_id: null,
          uploaded_by: creatorId,
          file_name: f.originalname,
          file_path: f.path, // full relative path where multer stored it
          mime_type: f.mimetype,
          file_size: f.size
        });
      }
    }

    // TODO: trigger notification to assigned_to (email/websocket)
    const task = await SpecialTasksModel.getTaskById(insertId);
    return res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
};

/**
 * Get task with correspondence and attachments
 */
export const getTask = async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

    const task = await SpecialTasksModel.getTaskById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // load top-level attachments
    const attachments = await AttachmentsModel.listByTask(taskId);

    // load correspondence
    const correspondence = await CorrespondenceModel.listByTask(taskId);

    // load attachments for correspondence in batch
    const corrIds = correspondence.map(c => c.id).filter(Boolean);
    const corrAttachments = await AttachmentsModel.listByCorrespondenceIds(corrIds);

    // attach attachments to correspondence items
    const corrMap = {};
    for (const c of correspondence) corrMap[c.id] = { ...c, attachments: [] };
    for (const a of corrAttachments) {
      if (corrMap[a.correspondence_id]) corrMap[a.correspondence_id].attachments.push(a);
    }

    const correspondenceWithAttachments = Object.values(corrMap);

    return res.json({
      task,
      attachments,
      correspondence: correspondenceWithAttachments
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List tasks with basic filters & pagination
 * Query params: limit, offset, status, assigned_to, created_by
 */
export const listTasks = async (req, res, next) => {
  try {
    const { limit = 25, offset = 0, status, assigned_to, created_by } = req.query;
    const tasks = await SpecialTasksModel.listTasks({ limit, offset, status, assigned_to, created_by });
    return res.json({ tasks });
  } catch (err) {
    next(err);
  }
};

/**
 * Add correspondence (comment) to a task. Supports files via req.files.
 * Expects req.body.message, req.body.is_internal (optional)
 */
export const addCorrespondence = async (req, res, next) => {
  try {
    const senderId = req.user?.id;
    if (!senderId) return res.status(401).json({ error: 'Unauthorized' });

    const taskId = Number(req.params.id);
    if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

    const { message = null, is_internal = 0 } = req.body;

    // ensure task exists
    const task = await SpecialTasksModel.getTaskById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { insertId } = await CorrespondenceModel.create({
      task_id: taskId,
      sender_id: senderId,
      message,
      is_internal: Number(is_internal) ? 1 : 0
    });

    // handle uploaded files linked to correspondence
    if (req.files && req.files.length) {
      ensureUploadDir();
      for (const f of req.files) {
        await AttachmentsModel.create({
          task_id: null,
          correspondence_id: insertId,
          uploaded_by: senderId,
          file_name: f.originalname,
          file_path: f.path,
          mime_type: f.mimetype,
          file_size: f.size
        });
      }
    }

    const newCorr = await CorrespondenceModel.listByTask(taskId); // returns all; client can pick last
    // TODO: notify watchers
    return res.status(201).json({ message: 'Correspondence added', correspondence: newCorr });
  } catch (err) {
    next(err);
  }
};

/**
 * Update task fields (partial)
 * Accepts body with any of: task_name, description, status, priority, category, assigned_to
 */
export const updateTask = async (req, res, next) => {
  try {
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });

    const taskId = Number(req.params.id);
    if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

    const allowed = ['task_name', 'description', 'status', 'priority', 'category', 'assigned_to'];
    const fields = {};
    for (const k of allowed) {
      if (k in req.body) fields[k] = req.body[k];
    }
    if (!Object.keys(fields).length) return res.status(400).json({ error: 'No valid fields to update' });

    await SpecialTasksModel.updateTask(taskId, fields);

    // Optionally, log the change as an internal correspondence
    await CorrespondenceModel.create({
      task_id: taskId,
      sender_id: actorId,
      message: `Task updated: ${Object.keys(fields).join(', ')}`,
      is_internal: 1
    });

    const updated = await SpecialTasksModel.getTaskById(taskId);
    return res.json({ message: 'Task updated', task: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete attachment (files removed from disk + DB row)
 */
export const deleteAttachment = async (req, res, next) => {
  try {
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });

    const attachId = Number(req.params.id);
    if (!attachId) return res.status(400).json({ error: 'Invalid attachment id' });

    const att = await AttachmentsModel.getById(attachId);
    if (!att) return res.status(404).json({ error: 'Attachment not found' });

    // Authorization: allow uploader or admins (you should replace this with real permission checks)
    if (att.uploaded_by !== actorId /* && !req.user.isAdmin */) {
      return res.status(403).json({ error: 'Not allowed to delete this attachment' });
    }

    // remove file from disk (if stored locally)
    if (att.file_path && att.file_path.startsWith(process.cwd())) {
      try { fs.unlinkSync(att.file_path); } catch (e) { /* ignore if not found */ }
    } else if (att.file_path) {
      // if external (S3) store, call S3 delete here
    }

    await AttachmentsModel.deleteById(attachId);
    return res.json({ message: 'Attachment deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete task (hard delete). You might prefer to archive instead of hard delete.
 */
export const deleteTask = async (req, res, next) => {
  try {
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });

    const taskId = Number(req.params.id);
    if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

    // TODO: permission check (only admin or task creator)
    await SpecialTasksModel.deleteTask(taskId);

    // attachments and correspondence are set to cascade in schema
    return res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};
