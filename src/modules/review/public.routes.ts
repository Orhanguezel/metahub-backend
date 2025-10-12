import express from "express";
import { createPublicReview, listApprovedForPublic, getStatsForProduct, addReaction } from "./public.controller";
import { validateObjectId, validatePublicCreate, validatePublicListQuery } from "./validation";

const router = express.Router();

// List + stats
router.get("/", validatePublicListQuery, listApprovedForPublic);
router.get("/stats", getStatsForProduct);

// Create (auth opsiyonel – varsa req.user kullanılır)
router.post("/", validatePublicCreate, createPublicReview);

// Reactions
router.post("/:id/like", validateObjectId("id"), addReaction("like"));
router.post("/:id/dislike", validateObjectId("id"), addReaction("dislike"));

export default router;
