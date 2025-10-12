import express from "express";
import { trackByTrackingNo } from "./public.controller";
import { vTrackPublic } from "./validation";

const router = express.Router();
router.get("/track/:trackingNo", vTrackPublic, trackByTrackingNo);

export default router;
