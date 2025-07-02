// src/modules/services/public.services.routes.ts
import express from "express";
import {
  getAllServices,
  getServicesById,
  getServicesBySlug,
} from "./public.services.controller";
import { validateObjectId } from "./services.validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllServices);
router.get("/slug/:slug", getServicesBySlug);
router.get("/:id", validateObjectId("id"), getServicesById);

export default router;
