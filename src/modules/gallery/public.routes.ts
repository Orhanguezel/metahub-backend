import express from "express";
import * as publicController from "./public.controller";
import { validatePublicQuery, validateObjectId } from "./validation";

const router = express.Router();

/* 🔓 Public */
router.get("/published", validatePublicQuery, publicController.getPublishedGalleryItems);
router.get("/search", publicController.searchGalleryItems);
router.get("/stats", publicController.getGalleryStats);
router.get("/categories", publicController.getGalleryCategories);
router.get("/category/:category([0-9a-fA-F]{24})", validateObjectId("category"), publicController.getPublishedGalleryItemsByCategory);

/* Tekil (Public) – aktif ve yayınlanmış içerik döner */
router.get("/:id([0-9a-fA-F]{24})", validateObjectId("id"), publicController.getGalleryItemById);

export default router;
