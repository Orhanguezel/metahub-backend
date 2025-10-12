import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import { createStockledger, getStockledgers } from "./controller";
import { validateCreateStockledger, validateGetStockledgers } from "./validation";

const router = express.Router();

/* 🔐 Admin-only */
router.use(authenticate, authorizeRoles("admin"));

/* GET /api/v1/stock-ledger */
router.get("/", validateGetStockledgers, getStockledgers);

/* POST /api/v1/stock-ledger */
router.post("/", validateCreateStockledger, createStockledger);

export default router;
