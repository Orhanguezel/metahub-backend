import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { ADDRESS_TYPE_OPTIONS } from "@/modules/address/types";

// --- Locale-aware error helper
function t(key: string, req: any) {
  const locale: SupportedLocale = req?.locale || "en";
  return translations?.[locale]?.[key] || translations.en[key] || key;
}

// --- Tekil adres validasyonu
export const validateAddress = [
  body("addressLine")
    .trim()
    .notEmpty().withMessage((_, { req }) => t("addresses.addressLineRequired", req))
    .isString().withMessage((_, { req }) => t("addresses.addressLineRequired", req)),
  body("addressType")
    .trim()
    .notEmpty().withMessage((_, { req }) => t("addresses.addressTypeRequired", req))
    .isString().withMessage((_, { req }) => t("addresses.addressTypeRequired", req))
    .isIn(ADDRESS_TYPE_OPTIONS).withMessage((_, { req }) => t("addresses.invalidType", req)),
  // Opsiyonel owner ID'ler (hepsi kontrol ediliyor)
  body("companyId").optional().isMongoId().withMessage((_, { req }) => t("addresses.companyIdInvalid", req)),
  body("userId").optional().isMongoId().withMessage((_, { req }) => t("addresses.userIdInvalid", req)),
  body("customerId").optional().isMongoId().withMessage((_, { req }) => t("addresses.customerIdInvalid", req)),
  body("sellerId").optional().isMongoId().withMessage((_, { req }) => t("addresses.sellerIdInvalid", req)),
  validateRequest,
];

// --- Toplu adres validasyonu (her adres için aynı validasyonlar) ---
export const validateUpdateAddresses = [
  body("addresses")
    .isArray({ min: 1 }).withMessage((_, { req }) => t("addresses.noAddressesProvided", req)),
  body("addresses.*.addressLine")
    .trim()
    .notEmpty().withMessage((_, { req }) => t("addresses.addressLineRequired", req))
    .isString().withMessage((_, { req }) => t("addresses.addressLineRequired", req)),
  body("addresses.*.addressType")
    .trim()
    .notEmpty().withMessage((_, { req }) => t("addresses.addressTypeRequired", req))
    .isString().withMessage((_, { req }) => t("addresses.addressTypeRequired", req))
    .isIn(ADDRESS_TYPE_OPTIONS).withMessage((_, { req }) => t("addresses.invalidType", req)),
  // Opsiyonel owner ID'ler
  body("addresses.*.companyId").optional().isMongoId().withMessage((_, { req }) => t("addresses.companyIdInvalid", req)),
  body("addresses.*.userId").optional().isMongoId().withMessage((_, { req }) => t("addresses.userIdInvalid", req)),
  body("addresses.*.customerId").optional().isMongoId().withMessage((_, { req }) => t("addresses.customerIdInvalid", req)),
  body("addresses.*.sellerId").optional().isMongoId().withMessage((_, { req }) => t("addresses.sellerIdInvalid", req)),
  validateRequest,
];

// --- ID validasyonu (çoklu dil) ---
export const validateAddressId = [
  param("id").isMongoId().withMessage((_, { req }) => t("addresses.invalidId", req)),
  validateRequest,
];
