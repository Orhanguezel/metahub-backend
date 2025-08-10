// src/modules/apartment/public.apartment.routes.ts
import express from "express";
import { publicGetAllApartment, publicGetApartmentBySlug } from "./public.controller";
import { validatePublicQuery, validateSlug } from "./validation";

const router = express.Router();

// Public list (map + filtreler)
router.get("/", validatePublicQuery, publicGetAllApartment);

// Public detail by slug
router.get("/:slug", validateSlug, publicGetApartmentBySlug);

export default router;
