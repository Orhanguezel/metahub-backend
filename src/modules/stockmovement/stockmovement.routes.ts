import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createStockMovement,
  getStockMovements,
} from "./stockmovement.controller";
import {
  validateCreateStockMovement,
  validateGetStockMovements,
} from "./stockmovement.validation";

const router = express.Router();

// 🔐 Admin Routes
router.use(authenticate, authorizeRoles("admin"));

// GET / -> List stock movements (with optional product filter)
router.get("/", validateGetStockMovements, getStockMovements);

// POST / -> Create new stock movement
router.post("/", validateCreateStockMovement, createStockMovement);

export default router;
