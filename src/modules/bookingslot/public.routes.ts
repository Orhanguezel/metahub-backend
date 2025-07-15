import express from "express";
import {
  getAllSlotRulesPublic,
  getAllSlotOverridesPublic,
  getAvailableSlotsPublic,
} from "./public.bookingslot.controller";

const router = express.Router();

// Çalışma saatleri (Kurallar)
router.get("/rules", getAllSlotRulesPublic);

// Tatil/kapalı günler (Overrides)
router.get("/overrides", getAllSlotOverridesPublic);

// Belirli bir günün mevcut slotları (örn: /bookingslot?date=2024-07-16)
router.get("/", getAvailableSlotsPublic);

export default router;
