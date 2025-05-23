// src/modules/apikey/apikey.routes.ts
import express from "express";
import { validateCreateApikey } from "./apikey.validation";
import {
  createApikey,
  getAllApikey,
  updateApikey,
  deleteApikey,
} from "./apikey.controller";
import { getApiKeyLogs } from "./apiKeyLog.controller";

const router = express.Router();


router.post("/", validateCreateApikey, createApikey);
router.get("/", getAllApikey);
router.put("/:id", validateCreateApikey, updateApikey);
router.delete("/:id", deleteApikey);
router.get("/:keyId/logs", getApiKeyLogs);

export default router;
