// src/routes/notification.routes.ts

import express from "express";
import {
  createNotification,
  getAllNotifications,
  deleteNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notification.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

router.get("/", authenticate, authorizeRoles("admin"), getAllNotifications);
router.post("/", authenticate, authorizeRoles("admin"), createNotification);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteNotification);

router.patch("/:id/read", authenticate, authorizeRoles("admin"), markNotificationAsRead);
router.patch("/mark-all-read", authenticate, authorizeRoles("admin"), markAllNotificationsAsRead);

export default router;
