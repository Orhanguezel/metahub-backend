import express from "express";
import {
  sendCatalogRequest,
  getAllCatalogRequests,
  deleteCatalogRequest,
  markCatalogRequestAsRead,
} from "./catalog.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateSendCatalogRequest,
  validateCatalogRequestIdParam,
} from "./catalog.validation";

const router = express.Router();

// ✅ Public: Katalog isteği gönder
router.post("/", validateSendCatalogRequest, sendCatalogRequest);

// ✅ Admin: Tüm katalog talepleri
router.get("/", authenticate, authorizeRoles("admin"), getAllCatalogRequests);

// ✅ Admin: Talebi sil
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateCatalogRequestIdParam,
  deleteCatalogRequest
);

// ✅ Admin: Okundu işaretle
router.patch(
  "/:id/read",
  authenticate,
  authorizeRoles("admin"),
  validateCatalogRequestIdParam,
  markCatalogRequestAsRead
);

export default router;
