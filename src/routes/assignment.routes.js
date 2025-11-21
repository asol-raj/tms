// src/routes/assignment.routes.js
import express from "express";
import AssignmentController from "../controllers/assignment.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

// Protect all these routes: user must be authenticated and an admin
// router.use(authMiddleware, isAdmin);

// Generic assign (custom filters)
router.post("/assign", AssignmentController.assignToUsers);

// Convenience assign to all active regular users (is_active=1 & user_role='user')
router.post("/assign-to-all-active", AssignmentController.assignToAllActiveUsers);

// Remove assignment (single user or all)
router.post("/remove", AssignmentController.removeAssignment);

export default router;
