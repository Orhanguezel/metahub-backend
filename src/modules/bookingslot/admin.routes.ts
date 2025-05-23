// @/modules/bookingSlot/admin.routes.ts

import express from "express";
import {
  createSlotRule,
  createSlotOverride,
  deleteSlotRule,
  deleteSlotOverride,
   getAllSlotRules,
  getAllSlotOverrides,
} from "./bookingslot.controller";

import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateSlotRule,
  validateCreateSlotOverride,
  validateObjectId,
} from "./bookingslot.validation";

const router = express.Router();

// 🔐 Admin Guard
router.use(authenticate, authorizeRoles("admin"));

// 🎯 Slot Rule - get all
router.get("/rule", getAllSlotRules);
// 🎯 Slot Override - get all
router.get("/override", getAllSlotOverrides);

// 🎯 Slot Rule - create/delete (weekly recurrence)
router.post("/rule", validateCreateSlotRule, createSlotRule);
router.delete("/rule/:id", validateObjectId("id"), deleteSlotRule);

// 🎯 Slot Override - create/delete (specific day exceptions)
router.post("/override", validateCreateSlotOverride, createSlotOverride);
router.delete("/override/:id", validateObjectId("id"), deleteSlotOverride);

export default router;
