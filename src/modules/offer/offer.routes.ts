import express from "express";
import {
  createOffer,
  getOffers,
  getOfferById,
  updateOffer,
  updateOfferStatus,
  deleteOffer,
  generateOfferPdfAndLink,
  requestOfferHandler,
} from "./offer.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  idParamValidator,
  validateCreateOffer,
  validateUpdateOffer,
  validateUpdateOfferStatus,
  validateListOffers,
  validateRequestOffer,
} from "./offer.validation";

const router = express.Router();

// --- PUBLIC: Teklif İstek Formu ---
router.post(
  "/request-offer",
  validateRequestOffer,
  requestOfferHandler // → Doğrudan public, auth yok!
);

// 🔐 Admin: Teklifleri listele (filtre opsiyonlu)
router.get(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateListOffers,
  getOffers
);

// 📝 Yeni teklif oluştur
router.post("/", authenticate, validateCreateOffer, createOffer);

// 📌 Teklif detay (get/update/delete)
router
  .route("/:id")
  .get(authenticate, idParamValidator, getOfferById)
  .put(authenticate, idParamValidator, validateUpdateOffer, updateOffer)
  .delete(authenticate, authorizeRoles("admin"), idParamValidator, deleteOffer);

// 🔄 Statü güncelleme
router.patch(
  "/:id/status",
  authenticate,
  idParamValidator,
  validateUpdateOfferStatus,
  updateOfferStatus
);

router.post(
  "/:id/generate-pdf",
  authenticate,
  idParamValidator,
  generateOfferPdfAndLink
);

export default router;
