// backend/modules/recipes/public.routes.ts
import express from "express";
import { publicGetRecipes, publicGetRecipeBySlug, aiGeneratePublic } from "./public.controller";
import { validatePublicQuery, validateSlug } from "./validation";

const router = express.Router();

router.get("/", validatePublicQuery, publicGetRecipes);
router.get("/:slug", validateSlug, publicGetRecipeBySlug);
router.post("/generate", aiGeneratePublic); // AI üretim + DB'ye kaydet

export default router;
