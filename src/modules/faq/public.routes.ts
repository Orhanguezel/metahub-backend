import express from "express";
import { getPublishedFAQs, askFAQ } from "./public.controller";
import { validateAskFAQ } from "@/modules/faq/validation";

const router = express.Router();

router.get("/", getPublishedFAQs);       // 🌐 Yayındaki tüm SSS'leri getir
router.post("/ask", validateAskFAQ, askFAQ); // 🤖 AI destekli soru sorma

export default router;
