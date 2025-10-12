import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  listTaxRates, getTaxRateById, createTaxRate, updateTaxRate, deleteTaxRate,
  listZones, getZoneById, createZone, updateZone, deleteZone,
} from "./admin.controller";
import {
  validateCreateTax, validateListQuery, validateObjectId, validateUpdateTax,
  validateCreateZone, validateUpdateZone, validateZoneListQuery,
} from "./validation";

const router = express.Router();
router.use(authenticate, authorizeRoles("admin", "moderator"));

/* TaxRate */
router.get("/", validateListQuery, listTaxRates);
router.get("/:id", validateObjectId("id"), getTaxRateById);
router.post("/", validateCreateTax, createTaxRate);
router.put("/:id", validateObjectId("id"), validateUpdateTax, updateTaxRate);
router.delete("/:id", validateObjectId("id"), deleteTaxRate);

/* GeoZone */
router.get("/zones/list", validateZoneListQuery, listZones);
router.get("/zones/:id", validateObjectId("id"), getZoneById);
router.post("/zones", validateCreateZone, createZone);
router.put("/zones/:id", validateObjectId("id"), validateUpdateZone, updateZone);
router.delete("/zones/:id", validateObjectId("id"), deleteZone);

export default router;
