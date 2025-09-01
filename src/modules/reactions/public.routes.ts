import express from "express";
import { authenticate } from "@/core/middleware/authMiddleware";
import { rate, getRatingSummary, toggleReaction, setReaction, getSummary, getMyReactions } from "./public.controller";
import { validateRate, validateRatingSummaryQuery, validateToggle, validateSet, validateSummaryQuery, validateMyQuery } from "./validation";

const router = express.Router();

// Toggle/set (like/favorite/bookmark/emoji)
router.post("/toggle", authenticate, validateToggle, toggleReaction);
router.post("/set", authenticate, validateSet, setReaction);

// Rating
router.post("/rate", authenticate, validateRate, rate);
router.get("/ratings/summary", validateRatingSummaryQuery, getRatingSummary);

// Genel özet ve kullanıcının tepkileri
router.get("/summary", validateSummaryQuery, getSummary);
router.get("/me", authenticate, validateMyQuery, getMyReactions);

export default router;
