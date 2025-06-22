import express from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  getAllFavorites,
} from "./favorite.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateApiKey } from "@/core/middleware/validateApiKey";
import {
  addFavoriteValidator,
  removeFavoriteValidator,
} from "./favorite.validation";

const router = express.Router();

// ✅ User Routes
router.get("/user", authenticate, validateApiKey, getFavorites);
router.post(
  "/",
  authenticate,
  validateApiKey,
  addFavoriteValidator,
  addFavorite
);
router.delete(
  "/remove/:productId",
  authenticate,
  validateApiKey,
  removeFavoriteValidator,
  removeFavorite
);

// ✅ Admin Route: Get all favorites
router.get(
  "/admin/all",
  authenticate,
  authorizeRoles("admin"),
  getAllFavorites
);

export default router;
