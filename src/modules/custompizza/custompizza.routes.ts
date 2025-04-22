// src/routes/customPizza.routes.ts

import express from "express";
import {
  createCustomPizza,
  getAllCustomPizzas,
  getCustomPizzaById,
  deleteCustomPizza,
} from "./custompizza.controller";
import { authenticate } from "../../core/middleware/authMiddleware";

const router = express.Router();

// 🔒 Sadece giriş yapan kullanıcı kendi pizzalarını oluşturabilir
router.post("/", authenticate, createCustomPizza);

// 📥 Tüm custom pizzaları listele (admin panelde kullanılabilir)
router.get("/", authenticate, getAllCustomPizzas);

// 📥 Tekil custom pizza (id ile)
router.get("/:id", authenticate, getCustomPizzaById);

// 🗑️ Custom pizza silme
router.delete("/:id", authenticate, deleteCustomPizza);

export default router;
