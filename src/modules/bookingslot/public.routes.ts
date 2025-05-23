// @/modules/bookingslot/public.routes.ts

import express from "express";
import { getSlotsByDate } from "./bookingslot.controller";

const router = express.Router();

// 🌐 Public: Get available slots by date
router.get("/", getSlotsByDate); // /?date=2025-06-21

export default router;
