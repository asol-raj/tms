// src/routes/taskList.routes.js

import express from "express";
import TaskListController from "../controllers/taskList.controller.js";

// all routes by default have /auth/tasklist
const router = express.Router();

router.use((req, res, next) => {
    res.locals.user = req.user;
    next();
})

router.get('/', (req, res) => res.render('tasklists'));


// CREATE
router.post("/", TaskListController.create);

// READ ALL
router.get("/api", TaskListController.getAll);

// READ ONE
router.get("/api/:id", TaskListController.getById);

// UPDATE
router.put("/update/:id", TaskListController.update);

// DELETE
router.delete("/delete/:id", TaskListController.remove);

export default router;
