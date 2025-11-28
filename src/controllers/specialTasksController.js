// src/controllers/specialTasksController.js
// Drop-in replacement using your single models file exports
// Requires: npm i sharp mime-types

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { SpecialTasksModel, CorrespondenceModel, AttachmentsModel } from '../models/specialTasksModel.js';
import mime from 'mime-types';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// upload / thumbnail dirs (match your multer config)
const UPLOAD_DIR = path.join(process.cwd(), 'src', 'uploads', 'special_tasks');
const THUMBS_DIR = path.join(UPLOAD_DIR, 'thumbs');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(THUMBS_DIR)) fs.mkdirSync(THUMBS_DIR, { recursive: true });

// helper: generate thumbnail for images (returns absolute path or null)
async function generateThumbnail(filePath, thumbName) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const outPath = path.join(THUMBS_DIR, thumbName);
    if (fs.existsSync(outPath)) return outPath;

    await sharp(filePath)
      .resize({ width: 480, height: 360, fit: 'cover' })
      .jpeg({ quality: 78 })
      .toFile(outPath);

    return outPath;
  } catch (err) {
    console.warn('generateThumbnail failed for', filePath, err?.message || err);
    return null;
  }
}

// small helper: respond JSON
function sendJson(res, code, payload) {
  res.status(code).json(payload);
}

// check inline-viewable types
function isViewableInline(mimeType) {
  if (!mimeType) return false;
  const m = mimeType.toLowerCase();
  return m.startsWith('image/') || m === 'application/pdf';
}

/**
 * Create Task (handles req.files from multer)
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

    // handle uploaded files
    if (req.files && req.files.length) {
      for (const f of req.files) {
        // f.path should be the absolute path where multer saved it; if not, adapt
        const savedPath = f.path || path.join(UPLOAD_DIR, f.filename || f.originalname);
        const insertRes = await AttachmentsModel.create({
          task_id: insertId,
          correspondence_id: null,
          uploaded_by: creatorId,
          file_name: f.originalname,
          file_path: savedPath,
          mime_type: f.mimetype,
          file_size: f.size
        });

        const attachId = insertRes?.insertId || insertRes?.id || insertRes;

        // try generate thumbnail for images
        // try {
        //   const thumbName = `thumb_${attachId}.jpg`;
        //   const thumbAbs = await generateThumbnail(savedPath, thumbName);
        //   if (thumbAbs) {
        //     await AttachmentsModel.updateById(attachId, { thumbnail_path: path.join('thumbs', thumbName), has_thumbnail: 1 });
        //   }
        // } catch (err) {
        //   console.warn('thumb generation error', err?.message || err);
        // }
      }
    }

    const task = await SpecialTasksModel.getTaskById(insertId);
    return res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Task (+ attachments + correspondence)
 */
export const getTask = async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

    const task = await SpecialTasksModel.getTaskById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const attachments = await AttachmentsModel.listByTask(taskId);
    const correspondence = await CorrespondenceModel.listByTask(taskId);

    // load attachments for correspondence if any
    const corrIds = correspondence.map(c => c.id).filter(Boolean);
    const corrAttachments = corrIds.length ? await AttachmentsModel.listByCorrespondenceIds(corrIds) : [];
    const corrMap = {};
    for (const c of correspondence) corrMap[c.id] = { ...c, attachments: [] };
    for (const a of corrAttachments) {
      if (corrMap[a.correspondence_id]) corrMap[a.correspondence_id].attachments.push(a);
    }
    const correspondenceWithAttachments = Object.values(corrMap);

    return res.json({ task, attachments, correspondence: correspondenceWithAttachments });
  } catch (err) {
    next(err);
  }
};

/**
 * List tasks (with simple filters)
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
 * Add correspondence (message + files)
 */
export const addCorrespondence = async (req, res, next) => {
  try {
    const senderId = req.user?.id;
    if (!senderId) return res.status(401).json({ error: 'Unauthorized' });

    const taskId = Number(req.params.id);
    if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

    const { message = null, is_internal = 0 } = req.body;
    const task = await SpecialTasksModel.getTaskById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { insertId } = await CorrespondenceModel.create({
      task_id: taskId,
      sender_id: senderId,
      message,
      is_internal: Number(is_internal) ? 1 : 0
    });

    if (req.files && req.files.length) {
      for (const f of req.files) {
        const savedPath = f.path || path.join(UPLOAD_DIR, f.filename || f.originalname);
        const insertRes = await AttachmentsModel.create({
          task_id: null,
          correspondence_id: insertId,
          uploaded_by: senderId,
          file_name: f.originalname,
          file_path: savedPath,
          mime_type: f.mimetype,
          file_size: f.size
        });

        const attachId = insertRes?.insertId || insertRes?.id || insertRes;
        try {
          const thumbName = `thumb_${attachId}.jpg`;
          const thumbAbs = await generateThumbnail(savedPath, thumbName);
          if (thumbAbs) {
            await AttachmentsModel.updateById(attachId, { thumbnail_path: path.join('thumbs', thumbName), has_thumbnail: 1 });
          }
        } catch (err) {
          console.warn('thumb generation error', err?.message || err);
        }
      }
    }

    const newCorr = await CorrespondenceModel.listByTask(taskId);
    return res.status(201).json({ message: 'Correspondence added', correspondence: newCorr });
  } catch (err) {
    next(err);
  }
};

/**
 * Update task (partial)
 */
export const updateTask = async (req, res, next) => {
  try {
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });

    const taskId = Number(req.params.id);
    if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

    const allowed = ['task_name', 'description', 'status', 'priority', 'category', 'assigned_to'];
    const fields = {};
    for (const k of allowed) if (k in req.body) fields[k] = req.body[k];
    if (!Object.keys(fields).length) return res.status(400).json({ error: 'No valid fields to update' });

    await SpecialTasksModel.updateTask(taskId, fields);

    // log internal note of update
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
 * Delete attachment
 */
export const deleteAttachment = async (req, res, next) => {
  try {
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });

    const attachId = Number(req.params.id);
    if (!attachId) return res.status(400).json({ error: 'Invalid attachment id' });

    const att = await AttachmentsModel.getById(attachId);
    if (!att) return res.status(404).json({ error: 'Attachment not found' });

    if (att.uploaded_by !== actorId /* && !req.user.isAdmin */) {
      return res.status(403).json({ error: 'Not allowed to delete this attachment' });
    }

    // remove files on disk
    try {
      if (att.file_path && fs.existsSync(att.file_path)) fs.unlinkSync(att.file_path);
      if (att.thumbnail_path) {
        const tAbs = path.isAbsolute(att.thumbnail_path) ? att.thumbnail_path : path.join(UPLOAD_DIR, att.thumbnail_path);
        if (fs.existsSync(tAbs)) fs.unlinkSync(tAbs);
      }
    } catch (e) {
      console.warn('file delete warning', e?.message || e);
    }

    await AttachmentsModel.deleteById(attachId);
    return res.json({ message: 'Attachment deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete task (hard delete)
 */
export const deleteTask = async (req, res, next) => {
  try {
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });

    const taskId = Number(req.params.id);
    if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

    // TODO: permission checks
    await SpecialTasksModel.deleteTask(taskId);

    return res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * Serve attachment with correct headers (inline for images/PDF)
 */
export const getAttachment = async (req, res, next) => {
  try {
    const attachId = Number(req.params.id);
    if (!attachId) return res.status(400).json({ error: 'Invalid attachment id' });

    const att = await AttachmentsModel.getById(attachId);
    if (!att) return res.status(404).json({ error: 'Attachment not found' });

    // resolve path
    let filePath = att.file_path || att.path || '';
    if (!path.isAbsolute(filePath)) filePath = path.join(UPLOAD_DIR, filePath);

    if (!fs.existsSync(filePath)) return res.status(410).json({ error: 'File not available' });

    const contentType = (att.mime_type && att.mime_type.trim()) || mime.lookup(att.file_name) || 'application/octet-stream';
    const inline = isViewableInline(contentType);
    const disposition = inline ? 'inline' : 'attachment';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(att.file_name || path.basename(filePath))}"`);
    res.setHeader('Content-Length', fs.statSync(filePath).size);

    const stream = fs.createReadStream(filePath);
    stream.on('error', err => next(err));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

/**
 * Serve thumbnail: prefer generated thumb, fallback to original image or small SVG
 */
export const getAttachmentThumbnail = async (req, res, next) => {
  try {
    const attachId = Number(req.params.id);
    if (!attachId) return res.status(400).json({ error: 'Invalid attachment id' });

    const att = await AttachmentsModel.getById(attachId);
    if (!att) return res.status(404).json({ error: 'Attachment not found' });

    // if (att.thumbnail_path) {
    //   let thumbAbs = att.thumbnail_path;
    //   if (!path.isAbsolute(thumbAbs)) thumbAbs = path.join(UPLOAD_DIR, att.thumbnail_path);
    //   if (fs.existsSync(thumbAbs)) {
    //     res.setHeader('Content-Type', 'image/jpeg');
    //     return fs.createReadStream(thumbAbs).pipe(res);
    //   }
    // }

    // fallback: if original is image, stream it
    let fileAbs = att.file_path || '';
    if (!path.isAbsolute(fileAbs)) fileAbs = path.join(UPLOAD_DIR, att.file_path || '');
    if (fs.existsSync(fileAbs)) {
      const ctype = att.mime_type || mime.lookup(att.file_name) || '';
      if (ctype && ctype.startsWith('image/')) {
        res.setHeader('Content-Type', ctype);
        return fs.createReadStream(fileAbs).pipe(res);
      }
    }

    // final fallback: small SVG "FILE"
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="100%" height="100%" fill="#f4f4f4" rx="6"/><text x="50%" y="52%" font-size="16" fill="#666" text-anchor="middle" alignment-baseline="middle">FILE</text></svg>`);
  } catch (err) {
    next(err);
  }
};

// --- after addCorrespondence, before updateTask, for example ---
export const updateCorrespondence = async (req, res, next) => {
  try {
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });

    const corrId = Number(req.params.id);
    if (!corrId) return res.status(400).json({ error: 'Invalid correspondence id' });

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Load existing correspondence
    const corr = await CorrespondenceModel.getById(corrId);
    if (!corr) return res.status(404).json({ error: 'Correspondence not found' });

    // Only sender (or admin if you later add req.user.role === 'admin') can edit
    if (corr.sender_id !== actorId /* && !req.user.isAdmin */) {
      return res.status(403).json({ error: 'Not allowed to edit this correspondence' });
    }

    await CorrespondenceModel.updateById(corrId, { message });

    const updated = await CorrespondenceModel.getById(corrId);
    return res.json({ message: 'Correspondence updated', correspondence: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteCorrespondence = async (req, res, next) => {
  try {
    const actorId = req.user?.id;
    if (!actorId)
      return res.status(401).json({ error: "Unauthorized" });

    const corrId = Number(req.params.id);
    if (!corrId)
      return res.status(400).json({ error: "Invalid correspondence id" });

    // Load the row to check owner
    const corr = await CorrespondenceModel.getById(corrId);
    if (!corr)
      return res.status(404).json({ error: "Correspondence not found" });

    // Permission check: only creator can delete
    if (corr.sender_id !== actorId /* && !req.user.isAdmin */) {
      return res.status(403).json({ error: "Not allowed to delete this correspondence" });
    }

    await CorrespondenceModel.deleteById(corrId);

    return res.json({
      message: "Correspondence deleted",
      id: corrId
    });
  } catch (err) {
    next(err);
  }
};


// keep named exports for router usage
export default {
  createTask,
  getTask,
  listTasks,
  addCorrespondence,
  updateCorrespondence,
  updateTask,
  deleteAttachment,
  deleteTask,
  getAttachment,
  getAttachmentThumbnail,
  deleteCorrespondence
};
