import { Router } from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  idParamValidator,
  validateCreateOffer,
  validateUpdateOffer,
  validateUpdateOfferStatus,
  validateListOffers,
  validateRequestOffer,
} from "./validation";

import { requestOfferHandler } from "./public.controller";
import {
  listOffers, getOffer, createOffer, updateOffer, updateOfferStatus, deleteOffer
} from "./admin.controller";

const router = Router();

// --- PUBLIC ---
router.post("/request-offer", validateRequestOffer, requestOfferHandler);

// --- ADMIN ---
router.get("/", authenticate, authorizeRoles("admin"), validateListOffers, listOffers);
router.get("/:id", authenticate, idParamValidator, getOffer);
router.post("/", authenticate, validateCreateOffer, createOffer);
router.put("/:id", authenticate, idParamValidator, validateUpdateOffer, updateOffer);
router.patch("/:id/status", authenticate, idParamValidator, validateUpdateOfferStatus, updateOfferStatus);
router.delete("/:id", authenticate, authorizeRoles("admin"), idParamValidator, deleteOffer);

export default router;
