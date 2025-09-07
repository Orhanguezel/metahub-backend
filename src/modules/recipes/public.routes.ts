import express from "express";
import rateLimit from "express-rate-limit";
import { publicGetRecipes, publicGetRecipeBySlug, aiGeneratePublic } from "./public.controller";
import { validatePublicQuery, validateSlug } from "./validation";

const router = express.Router();

/* ========= RATE LIMITS =========
 * ENV ile ayarlanabilir; yoksa defaultlar kullanılır.
 */
const WINDOW_MS = Number(process.env.RECIPES_PUBLIC_WINDOW_MS || 60_000); // 1 dk
const LIST_MAX = Number(process.env.RECIPES_PUBLIC_LIST_MAX || 120);     // 1 dk'da 120 istek
const DETAIL_MAX = Number(process.env.RECIPES_PUBLIC_DETAIL_MAX || 200); // 1 dk'da 200 istek
const GENERATE_MAX = Number(process.env.RECIPES_PUBLIC_GENERATE_MAX || 10); // 1 dk'da 10 istek

const listLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: LIST_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

const detailLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: DETAIL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

const generateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: GENERATE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Public Endpoints ---
router.get("/", listLimiter, validatePublicQuery, publicGetRecipes);
router.get("/:slug", detailLimiter, validateSlug, publicGetRecipeBySlug);

// AI üretim + DB'ye kaydet (public; rate-limit zorunlu)
router.post("/generate", generateLimiter, aiGeneratePublic);

export default router;
