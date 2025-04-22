// src/routes/task.routes.ts
import express from "express";
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "./task.controller";
import { authenticate } from "../../core/middleware/authMiddleware";

const router = express.Router();

router
  .route("/")
  .get(authenticate, getAllTasks)
  .post(authenticate, createTask);

router
  .route("/:id")
  .get(authenticate, getTaskById)
  .put(authenticate, updateTask)
  .delete(authenticate, deleteTask);

export default router;
