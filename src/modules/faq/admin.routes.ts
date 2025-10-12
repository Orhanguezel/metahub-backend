import express from "express";
import {
  createFAQ,
  getAllFAQs,
  updateFAQ,
  deleteFAQ,
} from "./admin.controller";
import {
  validateCreateFAQ,
  validateUpdateFAQ,
  validateFAQId,
} from "@/modules/faq/validation";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

router.get("/", getAllFAQs); // ✅ Tüm kayıtları getir (admin görünüm)
router.post("/", validateCreateFAQ, createFAQ);
router.put("/:id", validateUpdateFAQ, updateFAQ);
router.delete("/:id", validateFAQId, deleteFAQ);

export default router;
