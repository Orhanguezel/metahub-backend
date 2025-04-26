import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { upsertSetting, getAllSettings, getSettingByKey, deleteSetting } from "./setting.controller";
import { validateUpsertSetting, validateSettingKeyParam } from "./setting.validation";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

// 🎯 Get All Settings
router.get("/", getAllSettings);

// 🔍 Get Setting By Key
router.get("/:key", validateSettingKeyParam, getSettingByKey);

// ➕ Create or Update Setting
router.post("/", validateUpsertSetting, upsertSetting);

// 🗑️ Delete Setting
router.delete("/:key", validateSettingKeyParam, deleteSetting);

export default router;
