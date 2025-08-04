import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

// ObjectId validator
export const idParamValidator = [
  param("id")
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
    ),
];

// Teklif kalemi validasyonu (her item için)
const itemValidator = body("items.*").custom((item, { req }) => {
  const t = (key: string, params?: any) =>
    translate(key, req.locale || getLogLocale(), translations, params);

  // En az bir ürün referansı zorunlu!
  if (!item.product && !item.ensotekprod) {
    throw new Error(t("validation.itemNeedsProduct"));
  }
  if (item.product && !item.product.match(/^[a-f\d]{24}$/i)) {
    throw new Error(t("validation.invalidProductId"));
  }
  if (item.ensotekprod && !item.ensotekprod.match(/^[a-f\d]{24}$/i)) {
    throw new Error(t("validation.invalidEnsotekprodId"));
  }
  if (!item.quantity || typeof item.quantity !== "number" || item.quantity <= 0) {
    throw new Error(t("validation.quantityInvalid"));
  }
  return true;
});

// ✅ Teklif oluşturma validasyonu
export const validateCreateOffer = [
  body("company")
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.companyRequired", req.locale || getLogLocale(), translations)
    ),
  body("customer")
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.customerRequired", req.locale || getLogLocale(), translations)
    ),
  body("items")
    .isArray({ min: 1 })
    .withMessage((_, { req }) =>
      translate("validation.itemsArrayRequired", req.locale || getLogLocale(), translations)
    ),
  itemValidator,
  validateMultilangField("paymentTerms"),
  body("validUntil")
    .isISO8601()
    .withMessage((_, { req }) =>
      translate("validation.validUntilInvalid", req.locale || getLogLocale(), translations)
    ),
  body("shippingCost").optional().isNumeric(),
  body("additionalFees").optional().isNumeric(),
  body("discount").optional().isNumeric(),
  body("currency").optional().isString(),
  body("notes").optional(),
  body("contactPerson").optional().isString(),
  validateRequest,
];

// ✅ Teklif güncelleme validasyonu
export const validateUpdateOffer = [
  body("company")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.companyRequired", req.locale || getLogLocale(), translations)
    ),
  body("customer")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.customerRequired", req.locale || getLogLocale(), translations)
    ),
  body("items")
    .optional()
    .isArray({ min: 1 })
    .withMessage((_, { req }) =>
      translate("validation.itemsArrayRequired", req.locale || getLogLocale(), translations)
    ),
  itemValidator,
  validateMultilangField("paymentTerms"),
  body("validUntil")
    .optional()
    .isISO8601()
    .withMessage((_, { req }) =>
      translate("validation.validUntilInvalid", req.locale || getLogLocale(), translations)
    ),
  body("shippingCost").optional().isNumeric(),
  body("additionalFees").optional().isNumeric(),
  body("discount").optional().isNumeric(),
  body("currency").optional().isString(),
  body("notes").optional(),
  body("contactPerson").optional().isString(),
  validateRequest,
];

// ✅ Durum güncelleme validasyonu
export const validateUpdateOfferStatus = [
  body("status")
    .isIn(["draft", "preparing", "sent", "pending", "approved", "rejected"])
    .withMessage((_, { req }) =>
      translate("validation.invalidOfferStatus", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

// ✅ Listeleme için filtre validasyonu
export const validateListOffers = [
  query("status")
    .optional()
    .isIn(["draft", "preparing", "sent", "pending", "approved", "rejected"])
    .withMessage((_, { req }) =>
      translate("validation.invalidOfferStatus", req.locale || getLogLocale(), translations)
    ),
  query("company").optional().isMongoId(),
  query("customer").optional().isMongoId(),
  query("user").optional().isMongoId(),
  query("sort").optional().isString(),
  validateRequest,
];

export const validateRequestOffer = [
  body("name").notEmpty().withMessage("Name is required."),
  body("email").isEmail().withMessage("Valid email is required."),
  body("phone").notEmpty().withMessage("Phone is required."),
  body("company").notEmpty().withMessage("Company is required."),
  body("productId").notEmpty().withMessage("ProductId is required."),
  body("productType").notEmpty().withMessage("ProductType is required."),
  validateRequest,
];
