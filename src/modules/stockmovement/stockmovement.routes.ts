import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { createStockMovement, getStockMovements } from "./stockmovement.controller";

const router = express.Router();

// 🔐 Admin Routes
router.use(authenticate, authorizeRoles("admin"));

router.get("/", getStockMovements);
router.post("/", createStockMovement);

export default router;
