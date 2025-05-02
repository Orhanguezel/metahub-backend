// src/modules/custompizza/custompizza.routes.ts
import express from "express";
import {
  createCustomPizza,
  getAllCustomPizzas,
  getCustomPizzaById,
  deleteCustomPizza,
} from "./custompizza.controller";
import { authenticate } from "@/core/middleware/authMiddleware";
import { createCustomPizzaValidator, validatePizzaIdParam } from "./custompizza.validation";
import { validateRequest } from "@/core/middleware/validateRequest";

const router = express.Router();

// 🔒 Authenticated users create custom pizza
router.post("/", authenticate, createCustomPizzaValidator, createCustomPizza);

// 🔐 Admin: list all custom pizzas
router.get("/", authenticate, getAllCustomPizzas);

// 🔐 Admin: get single custom pizza
router.get("/:id", authenticate, validatePizzaIdParam, getCustomPizzaById);

// 🔐 Admin: delete custom pizza
router.delete("/:id", authenticate, validatePizzaIdParam, deleteCustomPizza);

export default router;
