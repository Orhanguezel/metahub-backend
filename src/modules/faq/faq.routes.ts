import express from "express";
import {
  createFAQ,
  getAllFAQs,
  deleteFAQ,
  updateFAQ,
  askFAQ,
} from "./faq.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateFAQ,
  validateUpdateFAQ,
  validateFAQId,
} from "./faq.validation";

const router = express.Router();

// Public
router.get("/", getAllFAQs);
router.post("/ask", askFAQ);

// Admin
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateFAQ,
  createFAQ
);
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateUpdateFAQ,
  updateFAQ
);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateFAQId,
  deleteFAQ
);

export default router;
