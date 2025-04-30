// src/modules/favorite/favorite.routes.ts
import express from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "./favorite.controller";
import { authenticate } from "../../core/middleware/authMiddleware";
import { validateApiKey } from "../../core/middleware/validateApiKey";

const router = express.Router();

router.get("/user", authenticate, validateApiKey,getFavorites);
router.post("/", authenticate, validateApiKey,addFavorite);
router.delete("/remove/:productId", authenticate, validateApiKey,removeFavorite);

export default router;
