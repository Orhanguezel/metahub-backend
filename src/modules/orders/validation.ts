// src/modules/orders/order.validation.ts
import { body, param, query, header } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

const tReq = (req: any, key: string) =>
  translate(key, req.locale || getLogLocale(), translations);

/** Ödeme metodu alias → kanonik */
const normalizePaymentMethod = (v?: string): "cash_on_delivery" | "bank_transfer" | "credit_card" | "paypal" => {
  const x = String(v || "").toLowerCase().trim();

  const table: Record<string, string[]> = {
    cash_on_delivery: ["cod","cash_on_delivery","cash","kapida","kapida_odeme","kapıda","kapıda_odeme"],
    bank_transfer:    ["bank","bank_transfer","eft","havale"],
    credit_card:      ["card","credit","debit","credit_card","online","stripe","iyzico","paytr","craftgate","visa","mastercard","amex"],
    paypal:           ["paypal","pp"],
  };

  for (const [canon, list] of Object.entries(table)) {
    if (list.includes(x)) return canon as any;
  }
  // bilinmeyen → online kabul et
  return "credit_card";
};

/** Request body normalize middleware */
export const normalizeOrderBody = (req: any, _res: any, next: any) => {
  try {
    // serviceType default
    if (!req.body?.serviceType) req.body.serviceType = "delivery";

    // paymentMethod normalize
    if (req.body?.paymentMethod) {
      req.body.paymentMethod = normalizePaymentMethod(req.body.paymentMethod);
    }

    // shippingAddress trim + boşları sil
    if (req.body?.shippingAddress && typeof req.body.shippingAddress === "object") {
      const sa = req.body.shippingAddress;
      const cleaned: any = {};
      ["name","phone","street","addressLine","city","postalCode","country"].forEach((k) => {
        if (sa[k] != null) {
          const v = typeof sa[k] === "string" ? sa[k].trim() : sa[k];
          if (typeof v === "string" ? v.length > 0 : true) cleaned[k] = v;
        }
      });
      req.body.shippingAddress = cleaned;
    }
  } catch {
    /* noop */
  }
  next();
};

/** CREATE ORDER */
export const createOrderValidator = [
  // ⬇️ normalize önce çalışsın
  normalizeOrderBody,

  body("serviceType").optional().isIn(["delivery", "pickup", "dinein"])
    .withMessage((_, { req }) => tReq(req, "validation.serviceTypeInvalid")),
  body("branch").optional().isMongoId()
    .withMessage((_, { req }) => tReq(req, "validation.invalidBranchId")),
  body("tableNo").optional().isString(),

  body("items").isArray({ min: 1 })
    .withMessage((_, { req }) => tReq(req, "validation.itemsArrayRequired")),
  body("items.*.product").notEmpty()
    .withMessage((_, { req }) => tReq(req, "validation.productIdRequired")),
  body("items.*.productType").isIn(["product","ensotekprod","sparepart","menuitem"])
    .withMessage((_, { req }) => tReq(req, "validation.invalidProductType")),
  body("items.*.quantity").isInt({ min: 1 })
    .withMessage((_, { req }) => tReq(req, "validation.quantityMin1")),

  // ⬇️ Basit ürünlerde unitPrice opsiyonel; gönderilirse >=0 olmalı
  body("items.*").custom((val: any, { req }) => {
    if (val?.productType === "menuitem") return true;
    if (val?.unitPrice == null) return true;
    if (typeof val.unitPrice !== "number" || val.unitPrice < 0) {
      throw new Error(tReq(req, "validation.unitPricePositive"));
    }
    return true;
  }),

  // ⬇️ Menü satırının şekil doğrulaması
  body("items.*").custom((val: any, { req }) => {
    if (val?.productType !== "menuitem") return true;
    if (!val.menu || typeof val.menu !== "object") {
      throw new Error(tReq(req, "validation.menuSelectionInvalid"));
    }
    if (val.menu.modifiers && !Array.isArray(val.menu.modifiers)) {
      throw new Error(tReq(req, "validation.menuSelectionInvalid"));
    }
    if (Array.isArray(val.menu.modifiers)) {
      for (const m of val.menu.modifiers) {
        if (!m || typeof m !== "object") throw new Error(tReq(req, "validation.menuSelectionInvalid"));
        if (typeof m.groupCode !== "string" || !m.groupCode.trim()) throw new Error(tReq(req, "validation.menuSelectionInvalid"));
        if (typeof m.optionCode !== "string" || !m.optionCode.trim()) throw new Error(tReq(req, "validation.menuSelectionInvalid"));
        if (m.quantity != null && (!Number.isInteger(m.quantity) || m.quantity < 1)) {
          throw new Error(tReq(req, "validation.menuSelectionInvalid"));
        }
      }
    }
    if (val.menu.variantCode != null && typeof val.menu.variantCode !== "string") {
      throw new Error(tReq(req, "validation.menuSelectionInvalid"));
    }
    if (val.menu.depositIncluded != null && typeof val.menu.depositIncluded !== "boolean") {
      throw new Error(tReq(req, "validation.menuSelectionInvalid"));
    }
    if (val.menu.notes != null && typeof val.menu.notes !== "string") {
      throw new Error(tReq(req, "validation.menuSelectionInvalid"));
    }
    return true;
  }),

  // ⬇️ Delivery ise adres zorunlu (addressId veya gövde adresi)
  body().custom((body, { req }) => {
    const st = body?.serviceType || "delivery";
    if (st !== "delivery") return true;
    if (body?.addressId) return true;

    const sa = body?.shippingAddress;
    const hasStreetOrLine = !!(sa?.street || sa?.addressLine);
    const ok = sa && sa.name && sa.phone && hasStreetOrLine && sa.city && sa.postalCode && sa.country;
    if (!ok) throw new Error(tReq(req, "validation.shippingAddressRequired"));
    return true;
  }),

  // ⬇️ paymentMethod esnek: sanitizer ile normalize, sonra enum kontrol
  body("paymentMethod")
    .customSanitizer((v) => normalizePaymentMethod(v))
    .isIn(["cash_on_delivery","bank_transfer","credit_card","paypal"])
    .withMessage((_, { req }) => tReq(req, "validation.invalidPaymentMethod")),

  body("currency").optional().isString(),
  body("deliveryFee").optional().isFloat({ min: 0 }),
  body("tipAmount").optional().isFloat({ min: 0 }),
  body("serviceFee").optional().isFloat({ min: 0 }),
  body("taxTotal").optional().isFloat({ min: 0 }),

  // ⬇️ Idempotency-Key header opsiyonel; gönderilirse makul uzunlukta olsun
  header("Idempotency-Key").optional().isString().isLength({ min: 8, max: 128 }),

  // ✅ En sonda mutlaka:
  validateRequest,
];

/** ADMIN: LISTE FILTRE */
export const adminListQueryValidator = [
  query("serviceType").optional().isIn(["delivery", "pickup", "dinein"]),
  query("status").optional().isIn(["pending", "preparing", "shipped", "completed", "cancelled"]),
];

/** ADMIN/USER: STATUS & ADDRESS UPDATE */
export const updateOrderStatusValidator = [
  param("id").isMongoId(),
  body("status").isIn(["pending","preparing","shipped","completed","cancelled"]),
  validateRequest,
];

export const updateShippingAddressValidator = [
  body("shippingAddress").notEmpty()
    .withMessage((_, { req }) => tReq(req, "validation.shippingAddressRequired")),
  body("shippingAddress.name").optional().notEmpty(),
  body("shippingAddress.phone").optional().notEmpty(),
  body("shippingAddress.street").optional().notEmpty(),
  body("shippingAddress.addressLine").optional().notEmpty(),
  body("shippingAddress.city").optional().notEmpty(),
  body("shippingAddress.postalCode").optional().notEmpty(),
  body("shippingAddress.country").optional().notEmpty(),
  validateRequest,
];

export const listOrdersValidator = [
  query("lang").optional().isString(),
  query("serviceType").optional().isIn(["delivery","pickup","dinein"]),
  query("status").optional().isIn(["pending","preparing","shipped","completed","cancelled"]),
  query("q").optional().isString(),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  validateRequest,
];

export const getByOrderNoValidator = [
  param("orderNo").isString().notEmpty(),
  validateRequest,
];

export const cancelOrderValidator = [
  param("id").isMongoId(),
  body("reason").optional().isString().isLength({ max: 500 }),
  validateRequest,
];

export const addOrderNoteValidator = [
  param("id").isMongoId(),
  body("text").isString().trim().isLength({ min: 1, max: 2000 }),
  validateRequest,
];
