import express from "express";
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "./task.controller";
import { authenticate } from "@/core/middleware/authMiddleware";

const router = express.Router();

// GET /tasks -> Get all tasks
router.get("/", authenticate, getAllTasks);

// POST /tasks -> Create a task
router.post("/", authenticate, createTask);

// GET /tasks/:id -> Get task by ID
router.get("/:id", authenticate, getTaskById);

// PUT /tasks/:id -> Update task
router.put("/:id", authenticate, updateTask);

// DELETE /tasks/:id -> Delete task
router.delete("/:id", authenticate, deleteTask);

export default router;
