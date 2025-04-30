import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateCreateApikey } from "./apikey.validation";
import { createApikey, getAllApikey, updateApikey, deleteApikey } from "./apikey.controller";
import { getApiKeyLogs } from "./apiKeyLog.controller";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

// ➕ Create
router.post("/", validateCreateApikey, createApikey);

// 📝 Get All
router.get("/", getAllApikey);

// ✏️ Update
router.put("/:id", validateCreateApikey, updateApikey);

// 🗑️ Delete
router.delete("/:id", deleteApikey);


// ➕ Log 
router.get("/:keyId/logs", getApiKeyLogs);

export default router;
