import express from "express";
import {
  createOffer,
  getOffers,
  getOfferById,
  updateOffer,
  updateOfferStatus,
  deleteOffer,
} from "./offer.controller";

import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateRequest } from "@/core/middleware/validateRequest";
import { idParamValidator } from "./offer.validation";

const router = express.Router();

// 🔐 Admin: Tüm teklifleri getir
router.get("/", authenticate, authorizeRoles("admin"), getOffers);

// 📝 Kullanıcı: Yeni teklif oluştur
router.post("/", authenticate, createOffer);

// 📌 Teklif detayları (görüntüle, güncelle, sil)
router
  .route("/:id")
  .get(authenticate, idParamValidator, validateRequest, getOfferById)
  .put(authenticate, idParamValidator, validateRequest, updateOffer)
  .delete(authenticate, authorizeRoles("admin"), idParamValidator, validateRequest, deleteOffer);

// 🔄 Teklif durumu güncelleme
router.patch(
  "/:id/status",
  authenticate,
  idParamValidator,
  validateRequest,
  updateOfferStatus
);

export default router;
