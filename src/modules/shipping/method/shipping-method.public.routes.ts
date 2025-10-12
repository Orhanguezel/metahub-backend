// src/modules/shipping/shipping-method.public.routes.ts
import express from "express";
import { listActiveMethods, quoteMethod, trackShipmentPublic } from "./shipping-method.public.controller";
import { validatePublicList, validateQuote, validateTrack } from "./shipping-method.validation";

const router = express.Router();
/** public: liste & fiyatlama */
router.get("/", validatePublicList, listActiveMethods);
router.post("/quote", validateQuote, quoteMethod);
/** public: tracking */
router.get("/track/:trackingNo", validateTrack, trackShipmentPublic);

export default router;
