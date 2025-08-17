import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

// ObjectId
export const idParamValidator = [
  param("id").isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidObjectId", (req as any).locale || getLogLocale(), translations)
  ),
];

// Teklif kalemi doğrulayıcı (yalnızca ensotekprod | sparepart)
const itemValidator = body("items.*").custom((item, { req }) => {
  const t = (k: string, p?: any) => translate(k, (req as any).locale || getLogLocale(), translations, p);

  const type = String(item.productType || "").trim();
  if (!["ensotekprod", "sparepart"].includes(type)) {
    throw new Error(t("validation.invalidProductType"));
  }

  if (type === "ensotekprod") {
    if (!item.ensotekprod) throw new Error(t("validation.itemNeedsProduct"));
    if (!String(item.ensotekprod).match(/^[a-f\d]{24}$/i))
      throw new Error(t("validation.invalidEnsotekprodId"));
  } else {
    if (!item.sparepart) throw new Error(t("validation.itemNeedsProduct"));
    if (!String(item.sparepart).match(/^[a-f\d]{24}$/i))
      // NOTE: "invalidSparepartId" yoksa generic "invalidProductId" çevirisini kullanıyoruz
      throw new Error(t("validation.invalidProductId"));
  }

  if (!item.quantity || typeof item.quantity !== "number" || item.quantity <= 0)
    throw new Error(t("validation.quantityInvalid"));

  if (item.unitPrice !== undefined && (typeof item.unitPrice !== "number" || item.unitPrice < 0))
    throw new Error(t("validation.unitPriceInvalid"));
  if (item.customPrice !== undefined && (typeof item.customPrice !== "number" || item.customPrice < 0))
    throw new Error(t("validation.customPriceInvalid"));
  if (item.vat !== undefined && (typeof item.vat !== "number" || item.vat < 0 || item.vat > 100))
    throw new Error(t("validation.vatInvalid"));

  return true;
});

export const validateCreateOffer = [
  body("company").isMongoId().withMessage((_, { req }) =>
    translate("validation.companyRequired", (req as any).locale || getLogLocale(), translations)
  ),
  body("customer").isMongoId().withMessage((_, { req }) =>
    translate("validation.customerRequired", (req as any).locale || getLogLocale(), translations)
  ),
  body("items").isArray({ min: 1 }).withMessage((_, { req }) =>
    translate("validation.itemsArrayRequired", (req as any).locale || getLogLocale(), translations)
  ),
  itemValidator,
  body("paymentTerms").optional().isObject(),
  body("validUntil").isISO8601().withMessage((_, { req }) =>
    translate("validation.validUntilInvalid", (req as any).locale || getLogLocale(), translations)
  ),
  body("shippingCost").optional().isNumeric(),
  body("additionalFees").optional().isNumeric(),
  body("discount").optional().isNumeric(),
  body("currency").optional().isString(),
  body("notes").optional().isObject(),
  body("contactPerson").optional().isString(),
  validateRequest,
];

export const validateUpdateOffer = [
  body("company").optional().isMongoId(),
  body("customer").optional().isMongoId(),
  body("items").optional().isArray({ min: 1 }),
  itemValidator,
  body("paymentTerms").optional().isObject(),
  body("validUntil").optional().isISO8601(),
  body("shippingCost").optional().isNumeric(),
  body("additionalFees").optional().isNumeric(),
  body("discount").optional().isNumeric(),
  body("currency").optional().isString(),
  body("notes").optional().isObject(),
  body("contactPerson").optional().isString(),
  validateRequest,
];

export const validateUpdateOfferStatus = [
  body("status").isIn(["draft", "preparing", "sent", "pending", "approved", "rejected"])
    .withMessage((_, { req }) =>
      translate("validation.invalidOfferStatus", (req as any).locale || getLogLocale(), translations)
    ),
  body("note").optional().isString(),
  validateRequest,
];

export const validateListOffers = [
  query("status").optional().isIn(["draft", "preparing", "sent", "pending", "approved", "rejected"]),
  query("company").optional().isMongoId(),
  query("customer").optional().isMongoId(),
  query("user").optional().isMongoId(),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("sort").optional().isString(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  validateRequest,
];

// Public istek doğrulama
export const validateRequestOffer = [
  body("name").notEmpty(),
  body("email").isEmail(),
  body("phone").notEmpty(),
  body("company").notEmpty(),
  body("productId").isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidProductId", (req as any).locale || getLogLocale(), translations)
  ),
  body("productType").isIn(["ensotekprod", "sparepart"]).withMessage((_, { req }) =>
    translate("validation.invalidProductType", (req as any).locale || getLogLocale(), translations)
  ),
  body("message").optional().isString().isLength({ max: 2000 }),
  validateRequest,
];
