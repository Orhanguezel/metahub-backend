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
import upload, { uploadTypeWrapper } from "@/core/middleware/uploadMiddleware";

const router = express.Router();

// 🔒 Admin auth kontrolü
router.use(authenticate, authorizeRoles("admin"));

// 🔥 CRUD Endpoints
router.get("/", getAllSettings);

router.get(
  "/:key",
  validateSettingKeyParam,
  getSettingByKey
);

router.post(
  "/",
  validateUpsertSetting,
  upsertSetting
);

router.delete(
  "/:key",
  validateSettingKeyParam,
  deleteSetting
);

// 🆕 CREATE Logo Upload (POST)
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

// 🆕 UPDATE Logo Upload (PUT)
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
