import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createFeeRule,
  updateFeeRule,
  deleteFeeRule,
  adminGetFees,
  adminGetFeeById,
} from "./admin.controller";
import {
  validateCreateFee,
  validateUpdateFee,
  validateFeeListQuery,
  validateObjectId,
} from "./validation";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateFeeListQuery, adminGetFees);
router.get("/:id", validateObjectId("id"), adminGetFeeById);

router.post("/", validateCreateFee, createFeeRule);
router.put("/:id", validateObjectId("id"), validateUpdateFee, updateFeeRule);

router.delete("/:id", validateObjectId("id"), deleteFeeRule);

export default router;
