// src/modules/shipping/shipping-method.admin.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import { listMethods, getMethod, createMethod, updateMethod, deleteMethod } from "./shipping-method.admin.controller";
import { validateCreateMethod, validateMethodId, validateUpdateMethod } from "./shipping-method.validation";

const router = express.Router();
router.use(authenticate, authorizeRoles("admin"));

router.get("/", listMethods);
router.get("/:id", validateMethodId, getMethod);
router.post("/", validateCreateMethod, createMethod);
router.put("/:id", validateMethodId, validateUpdateMethod, updateMethod);
router.delete("/:id", validateMethodId, deleteMethod);

export default router;
