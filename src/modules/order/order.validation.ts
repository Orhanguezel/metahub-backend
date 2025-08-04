import { body } from "express-validator";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n"; // Order modülüne ait çeviri dosyan!

// --- Sipariş oluşturma validasyonu ---
export const createOrderValidator = [
  body("items")
    .isArray({ min: 1 })
    .withMessage((_, { req }) =>
      translate("validation.itemsArrayRequired", req.locale || getLogLocale(), translations)
    ),

  body("items.*.product")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.productIdRequired", req.locale || getLogLocale(), translations)
    ),

  body("items.*.productType")
    .isIn(["bike", "ensotekprod", "sparepart"])
    .withMessage((_, { req }) =>
      translate("validation.invalidProductType", req.locale || getLogLocale(), translations)
    ),

  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage((_, { req }) =>
      translate("validation.quantityMin1", req.locale || getLogLocale(), translations)
    ),

  body("items.*.unitPrice")
    .isFloat({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.unitPricePositive", req.locale || getLogLocale(), translations)
    ),

  body("items.*.tenant")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.tenantRequired", req.locale || getLogLocale(), translations)
    ),

  // shippingAddress alanları
  body("shippingAddress.name")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.shippingNameRequired", req.locale || getLogLocale(), translations)
    ),

  body("shippingAddress.phone")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.shippingPhoneRequired", req.locale || getLogLocale(), translations)
    ),

  body("shippingAddress.street")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.shippingStreetRequired", req.locale || getLogLocale(), translations)
    ),

  body("shippingAddress.city")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.shippingCityRequired", req.locale || getLogLocale(), translations)
    ),

  body("shippingAddress.postalCode")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.shippingPostalRequired", req.locale || getLogLocale(), translations)
    ),

  body("shippingAddress.country")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.shippingCountryRequired", req.locale || getLogLocale(), translations)
    ),

  body("shippingAddress.tenant")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.shippingTenantRequired", req.locale || getLogLocale(), translations)
    ),

  // totalPrice zorunlu ve >=0
  body("totalPrice")
    .isFloat({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.totalPricePositive", req.locale || getLogLocale(), translations)
    ),

  // paymentMethod enum
  body("paymentMethod")
    .isIn(["cash_on_delivery", "credit_card", "paypal"])
    .withMessage((_, { req }) =>
      translate("validation.invalidPaymentMethod", req.locale || getLogLocale(), translations)
    ),
];

// Sipariş durumu güncelleme validasyonu
export const updateOrderStatusValidator = [
  body("status")
    .isIn(["pending", "preparing", "shipped", "completed", "cancelled"])
    .withMessage((_, { req }) =>
      translate("validation.invalidOrderStatus", req.locale || getLogLocale(), translations)
    ),
];

// Sipariş adresi güncelleme validasyonu
export const updateShippingAddressValidator = [
  body("shippingAddress.name")
    .optional()
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.shippingNameRequired", req.locale || getLogLocale(), translations)
    ),
  body("shippingAddress.phone")
    .optional()
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.shippingPhoneRequired", req.locale || getLogLocale(), translations)
    ),
  body("shippingAddress.street")
    .optional()
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.shippingStreetRequired", req.locale || getLogLocale(), translations)
    ),
  body("shippingAddress.city")
    .optional()
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.shippingCityRequired", req.locale || getLogLocale(), translations)
    ),
  body("shippingAddress.postalCode")
    .optional()
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.shippingPostalRequired", req.locale || getLogLocale(), translations)
    ),
  body("shippingAddress.country")
    .optional()
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.shippingCountryRequired", req.locale || getLogLocale(), translations)
    ),
  body("shippingAddress.tenant")
    .optional()
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.shippingTenantRequired", req.locale || getLogLocale(), translations)
    ),
];
