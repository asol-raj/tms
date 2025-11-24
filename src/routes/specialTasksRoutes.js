// src/routes/specialTasksRoutes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
  createTask,
  getTask,
  listTasks,
  addCorrespondence,
  updateTask,
  deleteAttachment,
  deleteTask
} from '../controllers/specialTasksController.js';

const router = express.Router();

// -- Multer config --
const storagePath = path.join(process.cwd(), 'src', 'uploads', 'special_tasks');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storagePath);
  },
  filename: (req, file, cb) => {
    // produce unique filename: uuid + timestamp + original ext
    const ext = path.extname(file.originalname) || '';
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit (adjust)
});

// -- Simple auth placeholder -- replace with your real middleware
const ensureAuth = (req, res, next) => {
  // Expect req.user to be set (e.g. via earlier middleware that decodes JWT/session)
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Routes:
// Create task with optional file uploads (field name `files`)
router.post('/create', ensureAuth, upload.array('files'), createTask);

// List tasks (filters)
router.get('/list', ensureAuth, listTasks);

// Get one task with correspondence and attachments
router.get('/list/:id', ensureAuth, getTask);

// Add correspondence to a task (multipart for files)
router.post('/create/:id/correspondence', ensureAuth, upload.array('files'), addCorrespondence);

// Update task (partial)
router.patch('/update/:id', ensureAuth, updateTask);

// Delete attachment
router.delete('/delete/attachments/:id', ensureAuth, deleteAttachment);

// Delete task
router.delete('delete/:id', ensureAuth, deleteTask);

export default router;
