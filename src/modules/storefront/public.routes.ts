import express from "express";
import {
  getPublicSettings,
  getPublicBanners,
  getPublicBannersGrouped,
  getPublicMenus,
  getPublicMenuByKey,
  getPublicHighlights,
  getPublicSocials,
  getPublicMeta,
  getPublicPositions,
} from "./public.controller";
import {
  validatePublicFields,
  validatePublicBanners,
  validatePublicMenuByKey,
} from "./validation";

const router = express.Router();

/** Public: auth yok */
router.get("/", validatePublicFields, getPublicSettings);

router.get("/banners", validatePublicBanners, getPublicBanners);
router.get("/banners/grouped", validatePublicBanners, getPublicBannersGrouped);

router.get("/menus", getPublicMenus);
router.get("/menus/:key", validatePublicMenuByKey, getPublicMenuByKey);

router.get("/highlights", getPublicHighlights);
router.get("/socials", getPublicSocials);
router.get("/meta", getPublicMeta);
router.get("/positions", getPublicPositions);

export default router;
