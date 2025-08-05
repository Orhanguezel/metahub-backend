import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

// --- Çoklu dil validasyon mesajı helper ---
function getValidationMessage(key: string, req: any) {
  const locale = req.locale || "en";
  return translations[key]?.[locale] || translations[key]?.en || key;
}

// 🔤 Kısa i18n helper
const tMsg = (key: string, req: any) =>
  translate(key, req.locale || getLogLocale(), translations);

// ✅ ObjectId Validator
export const validateCustomerIdParam = [
  param("id")
    .isMongoId()
    .withMessage((_, { req }) => tMsg("customer.validation.invalidObjectId", req)),
  validateRequest,
];

// ✅ Create Customer Validator (adres ZORUNLU DEĞİL!)
export const createCustomerValidator = [
  body("companyName")
    .notEmpty()
    .withMessage((_, { req }) => tMsg("customer.validation.companyNameRequired", req)),
  body("contactName")
    .notEmpty()
    .withMessage((_, { req }) => tMsg("customer.validation.contactNameRequired", req)),
  body("email")
    .isEmail()
    .withMessage((_, { req }) => tMsg("customer.validation.invalidEmail", req)),
  body("phone")
    .notEmpty()
    .withMessage((_, { req }) => tMsg("customer.validation.phoneRequired", req)),

  // addresses opsiyonel, array olmalı
  body("addresses")
    .optional()
    .isArray()
    .withMessage((_, { req }) => tMsg("customer.validation.addressesMustBeArray", req)),

  // Her bir adresin alanlarını kontrol et (array içi!)
  body("addresses.*.addressType")
    .optional()
    .isString()
    .withMessage((_, { req }) => tMsg("address.type.invalid", req)),
  body("addresses.*.street")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("address.street.invalid", req)),
  body("addresses.*.city")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("address.city.invalid", req)),
  body("addresses.*.postalCode")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("address.postalCode.invalid", req)),
  body("addresses.*.country")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("address.country.invalid", req)),

  validateRequest,
];

// ✅ Update Customer Validator (adres opsiyonel ve array)
export const updateCustomerValidator = [
  body("companyName")
    .optional()
    .isString()
    .withMessage((_, { req }) => tMsg("customer.validation.invalidString", req)),
  body("contactName")
    .optional()
    .isString()
    .withMessage((_, { req }) => tMsg("customer.validation.invalidString", req)),
  body("email")
    .optional()
    .isEmail()
    .withMessage((_, { req }) => tMsg("customer.validation.invalidEmail", req)),
  body("phone")
    .optional()
    .isString()
    .withMessage((_, { req }) => tMsg("customer.validation.invalidString", req)),

  // addresses opsiyonel ve array olmalı (güncellemede de)
  body("addresses")
    .optional()
    .isArray()
    .withMessage((_, { req }) => tMsg("customer.validation.addressesMustBeArray", req)),
  body("addresses.*.addressType")
    .optional()
    .isString()
    .withMessage((_, { req }) => tMsg("address.type.invalid", req)),
  body("addresses.*.street")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("address.street.invalid", req)),
  body("addresses.*.city")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("address.city.invalid", req)),
  body("addresses.*.postalCode")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("address.postalCode.invalid", req)),
  body("addresses.*.country")
    .optional()
    .isString()
    .withMessage((_, { req }) => getValidationMessage("address.country.invalid", req)),

  validateRequest,
];

// --- Public Update (Sadece belirli alanlar, adres hariç!) ---
export const updateCustomerPublicValidator = [
  body("companyName")
    .optional()
    .isString()
    .withMessage((_, { req }) => tMsg("customer.validation.invalidString", req)),
  body("contactName")
    .optional()
    .isString()
    .withMessage((_, { req }) => tMsg("customer.validation.invalidString", req)),
  body("email")
    .optional()
    .isEmail()
    .withMessage((_, { req }) => tMsg("customer.validation.invalidEmail", req)),
  body("phone")
    .optional()
    .isString()
    .withMessage((_, { req }) => tMsg("customer.validation.invalidString", req)),
  body("notes")
    .optional()
    .isString()
    .withMessage((_, { req }) => tMsg("customer.validation.invalidString", req)),
  // Adres kesinlikle yok!
  body("addresses").not().exists().withMessage("Adres güncelleme bu endpointte desteklenmiyor!"),
  validateRequest,
];


