import express from "express";
import {
  createFAQ,
  getAllFAQs,
  deleteFAQ,
  updateFAQ,
  askFAQ,
} from "./faq.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

// Public
router.get("/", getAllFAQs);
router.post("/ask", askFAQ);

// Admin
router.post("/", authenticate, authorizeRoles("admin"), createFAQ);
router.put("/:id", authenticate, authorizeRoles("admin"), updateFAQ); // 🔄 güncelleme
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteFAQ);

export default router;
