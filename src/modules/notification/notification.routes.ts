import { Router } from "express";
import {
  createNotification,
  getAllNotifications,
  deleteNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notification.controller";

import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateRequest } from "@/core/middleware/validateRequest";
import { createNotificationValidator, idParamValidator } from "./notification.validation";

const router = Router();

// Admin-only routes
router.use(authenticate, authorizeRoles("admin"));

router.get("/", getAllNotifications);

router.post("/", createNotificationValidator, validateRequest, createNotification);

router.delete("/:id", idParamValidator, validateRequest, deleteNotification);

router.patch("/:id/read", idParamValidator, validateRequest, markNotificationAsRead);

router.patch("/mark-all-read", markAllNotificationsAsRead);

export default router;
