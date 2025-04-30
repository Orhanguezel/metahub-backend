import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { upsertSetting, getAllSettings, getSettingByKey, deleteSetting } from "./setting.controller";
import { validateUpsertSetting, validateSettingKeyParam } from "./setting.validation";

const router = express.Router();

// 🔒 Admin auth kontrolü
router.use(authenticate, authorizeRoles("admin"));

// 🔥 CRUD Endpoints
router.get("/", getAllSettings);
router.get("/:key", validateSettingKeyParam, getSettingByKey);
router.post("/", validateUpsertSetting, upsertSetting);
router.delete("/:key", validateSettingKeyParam, deleteSetting);

export default router;
