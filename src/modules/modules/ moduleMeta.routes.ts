// src/modules/modules/moduleMeta.routes.ts
import express from "express";
import {
  createModuleMeta,
  updateModuleMeta,
  getAllModuleMetas,
  getModuleMetaByName,
  deleteModuleMeta,
  importModuleMetas,
} from "./moduleMeta.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateModuleMeta,
  validateUpdateModuleMeta,
  validateModuleNameParam,
} from "./admin.validation";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

router.post("/", validateCreateModuleMeta, createModuleMeta);
router.post("/bulk-import", importModuleMetas);
router.get("/", getAllModuleMetas);
router.get("/:name", validateModuleNameParam, getModuleMetaByName);
router.patch("/:name", validateModuleNameParam, validateUpdateModuleMeta, updateModuleMeta);
router.delete("/:name", validateModuleNameParam, deleteModuleMeta);

export default router;
