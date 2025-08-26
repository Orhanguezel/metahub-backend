import express from "express";
import { publicGetMenuItems, publicGetMenuItemBySlug } from "./public.controller";
import { validatePublicQuery, validateSlug } from "./validation";

const router = express.Router();

router.get("/", validatePublicQuery, publicGetMenuItems);
router.get("/:slug", validateSlug, publicGetMenuItemBySlug);

export default router;
