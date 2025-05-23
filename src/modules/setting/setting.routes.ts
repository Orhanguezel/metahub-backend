// src/modules/setting/setting.routes.ts

import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { 
  upsertSetting, 
  getAllSettings, 
  getSettingByKey, 
  deleteSetting, 
  upsertSettingImage, 
  updateSettingImage,
} from "./setting.controller";
import { 
  validateUpsertSetting, 
  validateSettingKeyParam,
} from "./setting.validation";
import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";

const router = express.Router();

router.get("/", getAllSettings);
router.get("/:key", validateSettingKeyParam, getSettingByKey);

// 🔒 Admin korumalı
router.use(authenticate, authorizeRoles("admin"));

// CRUD endpoints
router.post("/", validateUpsertSetting, upsertSetting);
router.delete("/:key", validateSettingKeyParam, deleteSetting);

// Logo Upload (POST)
router.post(
  "/upload/:key",
  uploadTypeWrapper("setting"),
  upload.fields([
    { name: "lightFile", maxCount: 1 },
    { name: "darkFile", maxCount: 1 },
  ]),
  validateSettingKeyParam,
  upsertSettingImage
);

// Logo Upload (PUT)
router.put(
  "/upload/:key",
  uploadTypeWrapper("setting"),
  upload.fields([
    { name: "lightFile", maxCount: 1 },
    { name: "darkFile", maxCount: 1 },
  ]),
  validateSettingKeyParam,
  updateSettingImage
);

export default router;
