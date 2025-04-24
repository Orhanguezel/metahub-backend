// src/routes/discount.routes.ts
import express from "express";
import {
  getAllDiscounts,
  createDiscount,
  applyDiscount,
  deleteDiscount,
} from "./discount.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

router.get("/", authenticate, authorizeRoles("admin"), getAllDiscounts);
router.post("/", authenticate, authorizeRoles("admin"), createDiscount);
router.post("/apply", applyDiscount);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteDiscount);

export default router;
