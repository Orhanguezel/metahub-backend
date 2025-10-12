// src/modules/pricing/public.routes.ts
import express from "express";
import { getQuote } from "./controller";
import { validateQuote } from "./validation";

// Public (guest/cart kullanımı için de uygun)
const router = express.Router();

router.post("/quote", validateQuote, getQuote);

export default router;
