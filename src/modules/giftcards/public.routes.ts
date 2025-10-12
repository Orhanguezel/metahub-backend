import express from "express";
import { publicGetByCode, publicRedeem } from "./public.controller";
import { validatePublicGet, validatePublicRedeem } from "./validation";
import { validateRequest } from "@/core/middleware/validateRequest";

const router = express.Router();

// Not: guest erişimi mümkün; dilerseniz auth/ratelimit ekleyin.
router.get("/", validatePublicGet, validateRequest, publicGetByCode);
router.post("/redeem", validatePublicRedeem, validateRequest, publicRedeem);

export default router;
