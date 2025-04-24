import express from "express";
import {
  createStockMovement,
  getStockMovements,
} from "./stockmovement.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

// 🔐 Admin Routes
router.get("/", authenticate, authorizeRoles("admin"), getStockMovements);
router.post("/", authenticate, authorizeRoles("admin"), createStockMovement);

export default router;
