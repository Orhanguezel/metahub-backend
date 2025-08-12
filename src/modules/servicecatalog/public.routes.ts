import express from "express";
import {
  getAllServiceCatalog,
  getServiceCatalogById,
  getServiceCatalogByCode,
} from "./public.controller";
import { validateObjectId } from "./validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllServiceCatalog);
router.get("/code/:code", getServiceCatalogByCode);
router.get("/:id", validateObjectId("id"), getServiceCatalogById);

export default router;
