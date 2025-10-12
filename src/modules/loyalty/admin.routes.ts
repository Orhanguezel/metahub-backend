import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminList, adminGetById, adminAdjust, adminSpend,
  adminUserBalance, adminDelete
} from "./admin.controller";
import {
  validateAdminList, validateAdminGetById, validateAdminAdjust,
  validateAdminSpend, validateAdminDelete, validateAdminUserBalance
} from "./validation";

const router = express.Router();
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateAdminList, adminList);
router.get("/:id", validateAdminGetById, adminGetById);

router.post("/adjust", validateAdminAdjust, adminAdjust);
router.post("/users/:userId/spend", validateAdminSpend, adminSpend);
router.get("/users/:userId/balance", validateAdminUserBalance, adminUserBalance);

router.delete("/:id", validateAdminDelete, adminDelete);

export default router;
