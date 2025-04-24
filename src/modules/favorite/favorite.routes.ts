// src/modules/favorite/favorite.routes.ts
import express from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "./favorite.controller";
import { authenticate } from "../../core/middleware/authMiddleware";

const router = express.Router();

router.get("/user", authenticate, getFavorites);
router.post("/", authenticate, addFavorite);
router.delete("/remove/:productId", authenticate, removeFavorite);

export default router;
