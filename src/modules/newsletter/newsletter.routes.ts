import express from "express";
import {
  subscribeNewsletter,
  unsubscribeNewsletter,
  getAllSubscribers,
  deleteSubscriber,
  verifySubscriber,
  sendBulkNewsletter,
  sendSingleNewsletter,
} from "./newsletter.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  validateSubscribe,
  validateUnsubscribe,
  validateNewsletterIdParam,
  validateBulkSend,
} from "./newsletter.validation";

const router = express.Router();

// Public
router.post("/", validateSubscribe, subscribeNewsletter);
router.post("/unsubscribe", validateUnsubscribe, unsubscribeNewsletter);

// Admin
router.get("/", authenticate, authorizeRoles("admin"), getAllSubscribers);
router.delete("/:id", authenticate, authorizeRoles("admin"), validateNewsletterIdParam, deleteSubscriber);
router.patch("/:id/verify", authenticate, authorizeRoles("admin"), validateNewsletterIdParam, verifySubscriber);
router.post("/send-bulk", authenticate, authorizeRoles("admin"), validateBulkSend, sendBulkNewsletter);
router.post("/:id/send", authenticate, authorizeRoles("admin"), validateNewsletterIdParam, validateBulkSend, sendSingleNewsletter);

export default router;
