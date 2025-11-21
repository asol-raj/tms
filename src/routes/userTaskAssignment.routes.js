// src/routes/userTaskAssignment.routes.js
import express from "express";
import UserTaskAssignmentController from "../controllers/userTaskAssignment.controller.js";
// import authMiddleware from "../middleware/authMiddleware.js";
// import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

// If you want this protected by auth or admin, uncomment middleware lines below or apply at top-level router
// router.use(authMiddleware);

router.post("/", UserTaskAssignmentController.create);
router.get("/", UserTaskAssignmentController.getAll);
router.get("/:id", UserTaskAssignmentController.getById);
router.put("/:id", UserTaskAssignmentController.update);
router.delete("/:id", UserTaskAssignmentController.remove);

export default router;
