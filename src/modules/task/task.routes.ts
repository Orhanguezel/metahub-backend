import express from "express";
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getMyTasks,
  updateMyTaskStatus,
} from "./task.controller";
import {
  validateCreateTask,
  validateUpdateTask,
  validateObjectIdParam,
  validateMyTaskUpdate,
} from "./task.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🔐
router.use("/admin", authenticate, authorizeRoles("admin", "moderator"));
router.post("/admin", validateCreateTask, createTask);
router.get("/admin", getAllTasks);
router.get("/admin/:id", validateObjectIdParam, getTaskById);
router.put("/admin/:id", validateObjectIdParam, validateUpdateTask, updateTask);
router.delete("/admin/:id", validateObjectIdParam, deleteTask);

// 👤
router.use("/me", authenticate);
router.get("/me", getMyTasks);
router.patch(
  "/me/:id",
  validateObjectIdParam,
  validateMyTaskUpdate,
  updateMyTaskStatus
);

export default router;
