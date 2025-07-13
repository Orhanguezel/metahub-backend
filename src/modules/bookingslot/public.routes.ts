import express from "express";
import { getSlotsByDate } from "./bookingslot.controller";

const router = express.Router();

// 🌐 Public: Get available slots by date (?date=YYYY-MM-DD)
router.get("/", getSlotsByDate);

export default router;
