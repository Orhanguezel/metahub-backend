import express from "express";
import {
  createSlotRule,
  createSlotOverride,
  deleteSlotRule,
  deleteSlotOverride,
  getAllSlotRulesAdmin,
  getAllSlotOverridesAdmin,
} from "./admin.bookingslot.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateSlotRule,
  validateCreateSlotOverride,
  validateObjectId,
} from "./bookingslot.validation";

const router = express.Router();

/**
 * ADMIN ENDPOINTS
 * Sadece admin erişebilir!
 */
router.use(authenticate, authorizeRoles("admin"));

// --- Slot Rules ---
router.get("/rule", getAllSlotRulesAdmin);
router.post("/rule", validateCreateSlotRule, createSlotRule);
router.delete("/rule/:id", validateObjectId("id"), deleteSlotRule);

// --- Slot Overrides ---
router.get("/override", getAllSlotOverridesAdmin);
router.post("/override", validateCreateSlotOverride, createSlotOverride);
router.delete("/override/:id", validateObjectId("id"), deleteSlotOverride);

export default router;
