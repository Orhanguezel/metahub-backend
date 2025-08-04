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
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateSubscribe,
  validateUnsubscribe,
  validateNewsletterIdParam,
  validateBulkSend,
  
} from "./newsletter.validation";

const router = express.Router();

// ✅ Public: Abone ol
router.post("/", validateSubscribe, subscribeNewsletter);

// ✅ Public: Abonelikten çık
router.post("/unsubscribe", validateUnsubscribe, unsubscribeNewsletter);

// ✅ Admin: Tüm aboneleri getir
router.get("/", authenticate, authorizeRoles("admin"), getAllSubscribers);

// ✅ Admin: Aboneyi sil
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateNewsletterIdParam,
  deleteSubscriber
);

// ✅ Admin: Manuel olarak "verified" yap (double opt-in override)
router.patch(
  "/:id/verify",
  authenticate,
  authorizeRoles("admin"),
  validateNewsletterIdParam,
  verifySubscriber
);

router.post(
  "/send-bulk",
  authenticate,
  authorizeRoles("admin"),
  validateBulkSend,
  sendBulkNewsletter
);

router.post(
  "/:id/send",
  authenticate,
  authorizeRoles("admin"),
  validateNewsletterIdParam,
  validateBulkSend, // subject ve html zorunlu
  sendSingleNewsletter
);

export default router;
