import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

const tByReq = (req: any) => (k: string) => translate(k, req.locale || getLogLocale(), translations);

/* ===== Admin validators ===== */

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_: any, { req }: any) => tByReq(req)("invalidObjectId")),
  validateRequest,
];

export const validateCreatePromotion = [
  body("name").notEmpty(),
  body("kind").optional().isIn(["auto", "coupon"]),
  body("code").optional().isString().toUpperCase(),
  body("effect.type").notEmpty().isIn(["percentage", "fixed", "free_delivery", "bxgy"]),
  body("effect.value").optional().isFloat({ min: 0 }),
  body("effect.bxgy").optional().custom((v) => {
    if (!v) return true;
    if (typeof v.buyQty !== "number" || v.buyQty < 1) throw new Error("bxgy.buyQty >= 1");
    if (typeof v.getQty !== "number" || v.getQty < 1) throw new Error("bxgy.getQty >= 1");
    return true;
  }),
  body("rules.minOrder.amount").optional().isFloat({ min: 0 }),
  body("rules.scope.serviceTypes").optional().isArray(),
  body("priority").optional().isInt(),
  body("stackingPolicy").optional().isIn(["none", "with_different", "with_same"]),
  validateRequest,
];

export const validateUpdatePromotion = [
  body("name").optional(),
  body("effect.type").optional().isIn(["percentage", "fixed", "free_delivery", "bxgy"]),
  body("effect.value").optional().isFloat({ min: 0 }),
  body("effect.bxgy").optional().custom((v) => {
    if (!v) return true;
    if (typeof v.buyQty !== "number" || v.buyQty < 1) throw new Error("bxgy.buyQty >= 1");
    if (typeof v.getQty !== "number" || v.getQty < 1) throw new Error("bxgy.getQty >= 1");
    return true;
  }),
  validateRequest,
];

export const validateAdminQuery = [
  query("q").optional().isString(),
  query("isActive").optional().toBoolean(),
  query("isPublished").optional().toBoolean(),
  query("kind").optional().isIn(["auto", "coupon"]),
  query("type").optional().isIn(["percentage", "fixed", "free_delivery", "bxgy"]),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  validateRequest,
];

/* ===== Public validators ===== */

export const validateEvaluate = [
  body("cart.items").isArray({ min: 1 }),
  body("cart.subtotal").isFloat({ min: 0.01 }),
  body("cart.currency").optional().isString(),
  body("cart.serviceType").optional().isIn(["delivery", "pickup", "dinein"]),
  body("cart.branchId").optional().isMongoId(),
  body("cart.items.*.itemId").notEmpty(),
  body("cart.items.*.unitPrice").isFloat({ min: 0 }),
  body("cart.items.*.quantity").isInt({ min: 1 }),
  validateRequest,
];

export const validateRedeem = [
  body("promotionId").notEmpty().isMongoId(),
  body("orderId").notEmpty().isMongoId(),
  body("userId").optional().isMongoId(),
  body("amount").optional().isFloat({ min: 0 }), // server yeniden hesaplayacak olsa da tutuyoruz
  body("currency").optional().isString(),
  validateRequest,
];
