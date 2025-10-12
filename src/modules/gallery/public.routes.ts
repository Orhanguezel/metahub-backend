import express from "express";
import * as publicController from "./public.controller";
import { validatePublicQuery, validateObjectId } from "./validation";

const router = express.Router();

/* 🔓 Public */
router.get("/published", validatePublicQuery, publicController.getPublishedGalleryItems);
router.get("/search", publicController.searchGalleryItems);
router.get("/categories", publicController.getGalleryCategories);

// Kategoriye göre (ID)
router.get("/category/:category([0-9a-fA-F]{24})", validateObjectId("category"), publicController.getPublishedGalleryItemsByCategory);

// ✅ Kategori SLUG ile
router.get("/category/slug/:slug", publicController.getPublishedGalleryItemsByCategorySlug);

// ✅ Tekil SLUG ile
router.get("/slug/:slug", publicController.getGalleryItemBySlug);

// Tekil ID (public)
router.get("/:id([0-9a-fA-F]{24})", validateObjectId("id"), publicController.getGalleryItemById);

export default router;
