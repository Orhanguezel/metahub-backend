import express from "express";
import { publicListBrands, publicGetBrandBySlug } from "./public.controller";
import { validateBrandListQuery, validateSlugParam } from "./validation";

const router = express.Router();

// Public listing
router.get("/", validateBrandListQuery, publicListBrands);

// Public detail by slug (locale-aware)
router.get("/:slug", validateSlugParam, publicGetBrandBySlug);

export default router;
