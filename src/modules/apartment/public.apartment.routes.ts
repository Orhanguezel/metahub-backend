import express from "express";
import {
  getAllApartments,
  getApartmentById,
  getApartmentBySlug,
} from "./public.apartment.controller";
import { validateObjectId } from "./apartment.validation";

const router = express.Router();

// 🌐 Public Endpoints
router.get("/", getAllApartments);
router.get("/slug/:slug", getApartmentBySlug);
router.get("/:id", validateObjectId("id"), getApartmentById);

export default router;
