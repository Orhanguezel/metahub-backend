import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  listInventory,
  getInventoryByProduct,
  rebuildInventory,
  updateSafetyStock,
} from "./controller";
import {
  validateListInventory,
  validateGetInventory,
  validateRebuildInventory,
  validateUpdateSafety,
} from "./validation";

const router = express.Router();

/* Admin-only envanter uçları */
router.use(authenticate, authorizeRoles("admin"));

router.get("/", validateListInventory, listInventory);
router.get("/:productId", validateGetInventory, getInventoryByProduct);

router.post("/rebuild", validateRebuildInventory, rebuildInventory);
router.patch("/:productId/safety", validateUpdateSafety, updateSafetyStock);

export default router;
