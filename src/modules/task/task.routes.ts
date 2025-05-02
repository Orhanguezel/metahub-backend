import express from "express";
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "./task.controller";
import {
  validateCreateTask,
  validateUpdateTask,
  validateTaskId,
} from "./task.validation";
import { authenticate } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🌿 Public/Admin: Get all tasks
router.get("/", authenticate, getAllTasks);

// ➕ Create task
router.post("/", authenticate, validateCreateTask, createTask);

// 🔍 Get single task
router.get("/:id", authenticate, validateTaskId, getTaskById);

// ✏️ Update task
router.put("/:id", authenticate, validateTaskId, validateUpdateTask, updateTask);

// 🗑️ Delete task
router.delete("/:id", authenticate, validateTaskId, deleteTask);

export default router;
