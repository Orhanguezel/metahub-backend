import express from "express";
import { resolveTaxRate, calcTax } from "./public.controller";
import { validateRequest } from "@/core/middleware/validateRequest";
import { body } from "express-validator";

const router = express.Router();

/** Uygulanabilir vergi kuralını bul (checkout) */
router.post(
  "/resolve",
  body("address").notEmpty().isObject(),
  body("productClass").optional().isString(),
  validateRequest,
  resolveTaxRate
);

/** Vergi hesapla (doğrudan ya da taxRateId ile) */
router.post(
  "/calc",
  body("amount_cents").notEmpty().isInt({ min: 0 }),
  body("ratePct").optional().isFloat({ min: 0, max: 100 }),
  body("inclusive").optional().isBoolean().toBoolean(),
  body("taxRateId").optional().isMongoId(),
  validateRequest,
  calcTax
);

export default router;
