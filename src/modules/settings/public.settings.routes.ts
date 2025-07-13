import express from "express";
import { getAllSettings, getSettingByKey } from "./public.settings.controller";
import {
  validateSettingKeyParam,
} from "./settings.validation";

const router = express.Router();

// --- PUBLIC ROUTES (client-side) ---
router.get("/", getAllSettings); // Tüm public settings
router.get("/:key", validateSettingKeyParam, getSettingByKey);

export default router;
