// modules/notifications/notification.routes.ts
import { Router } from "express";
import {
  createNotification,
  getAllNotifications,
  getMyNotifications,
  getUnreadCount,
  deleteNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notification.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createNotificationValidator,
  idParamValidator,
  listQueryValidator,
  myQueryValidator,
  unreadCountQueryValidator,
  markAllQueryValidator,
} from "./notification.validation";

const router = Router();

// tüm notification uçları auth ister
router.use(authenticate);

/**
 * Admin uçları
 */
router.get("/admin", authorizeRoles("admin"), listQueryValidator, getAllNotifications);
router.post("/", authorizeRoles("admin"), createNotificationValidator, createNotification);
router.delete("/:id", authorizeRoles("admin"), idParamValidator, deleteNotification);

/**
 * Kullanıcı uçları
 */
router.get("/my", myQueryValidator, getMyNotifications);
router.get("/unread-count", unreadCountQueryValidator, getUnreadCount);

// sahiplik kontrolü controller içinde (admin veya owner)
router.patch("/:id/read", idParamValidator, markNotificationAsRead);

// admin → tenant-wide; user → onlyMine=true ile
router.patch("/mark-all-read", markAllQueryValidator, markAllNotificationsAsRead);

export default router;
