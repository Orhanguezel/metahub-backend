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

const router = express.Router();

// 🔒 Admin: Tüm teklifleri getir
router.get("/", authenticate, authorizeRoles("admin"), getOffers);

// 📝 Kullanıcı: Yeni teklif oluştur
router.post("/", authenticate, createOffer);

// 📌 Teklif detayları (görüntüle, güncelle, sil)
router
  .route("/:id")
  .get(authenticate, getOfferById)                             // ➕ Detay
  .put(authenticate, updateOffer)                             // ✏️ Güncelle
  .delete(authenticate, authorizeRoles("admin"), deleteOffer); // ❌ Sil (sadece admin)

// 🔄 Teklif durumu güncelleme
router.patch("/:id/status", authenticate, updateOfferStatus);

export default router;
