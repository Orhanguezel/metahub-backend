import express from "express";
import { publicGetAllApartment, publicGetApartmentBySlug } from "./public.controller";
import { validatePublicQuery, validateSlug } from "./validation";

const router = express.Router();

/* Public list (map + filtreler) — v2 alanları içerir
   Not: validation tarafında 'service' (ObjectId) filtresini de desteklemeniz önerilir. */
router.get("/", validatePublicQuery, publicGetAllApartment);

/* Public detail by slug */
router.get("/:slug", validateSlug, publicGetApartmentBySlug);

export default router;
