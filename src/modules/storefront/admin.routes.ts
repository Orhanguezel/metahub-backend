import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import { getAdminSettings, upsertSettings } from "./admin.basic.controller";
import {
  addBannerFromMedia,
  uploadBanner,
  updateBanner,
  removeBanner,
  reorderBanners,
  bannerUploadMW,
} from "./admin.controller";
import {
  validateUpsertSettings,
  validateBannerCreateByMedia,
  validateBannerUpload,
  validateBannerUpdate,
  validateBannerDelete,
  validateBannerReorder,
} from "./validation";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "moderator"));

/** Settings */
router.get("/", getAdminSettings);
router.put("/", validateUpsertSettings, upsertSettings);

/** Banners */
router.post("/banners", validateBannerCreateByMedia, addBannerFromMedia);
router.post("/banners/upload", bannerUploadMW.single("file"), validateBannerUpload, uploadBanner);
router.put("/banners/:key", validateBannerUpdate, updateBanner);
router.delete("/banners/:key", validateBannerDelete, removeBanner);
router.put("/banners/reorder", validateBannerReorder, reorderBanners);

export default router;
