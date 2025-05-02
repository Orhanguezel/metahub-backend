import { Router } from "express";
import {
  createNotification,
  getAllNotifications,
  deleteNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notification.controller";

import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createNotificationValidator,
  idParamValidator,
} from "./notification.validation";

const router = Router();

// 🔐 Admin Routes
router.use(authenticate, authorizeRoles("admin"));

router.get("/", getAllNotifications);
router.post("/", createNotificationValidator, createNotification);
router.delete("/:id", idParamValidator, deleteNotification);
router.patch("/:id/read", idParamValidator, markNotificationAsRead);
router.patch("/mark-all-read", markAllNotificationsAsRead);

export default router;
