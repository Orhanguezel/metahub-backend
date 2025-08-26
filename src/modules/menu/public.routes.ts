import express from "express";
import { publicGetMenus, publicGetMenuBySlug } from "./public.controller";
import { validatePublicQuery, validateSlug } from "./validation";

const router = express.Router();

router.get("/", validatePublicQuery, publicGetMenus);
router.get("/:slug", validateSlug, publicGetMenuBySlug);

export default router;
