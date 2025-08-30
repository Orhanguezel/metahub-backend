// modules/order/validation.ts
import { body, query } from "express-validator";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

const tReq = (req: any, key: string) =>
  translate(key, req.locale || getLogLocale(), translations);

export const createOrderValidator = [
  body("serviceType")
    .optional()
    .isIn(["delivery", "pickup", "dinein"])
    .withMessage((_, { req }) => tReq(req, "validation.serviceTypeInvalid")),
  body("branch")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) => tReq(req, "validation.invalidBranchId")),
  body("tableNo").optional().isString(),

  body("items")
    .isArray({ min: 1 })
    .withMessage((_, { req }) => tReq(req, "validation.itemsArrayRequired")),
  body("items.*.product")
    .notEmpty()
    .withMessage((_, { req }) => tReq(req, "validation.productIdRequired")),
  body("items.*.productType")
    .isIn(["bike", "ensotekprod", "sparepart", "menuitem"])
    .withMessage((_, { req }) => tReq(req, "validation.invalidProductType")),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage((_, { req }) => tReq(req, "validation.quantityMin1")),

  // menuitem için BE hesaplar; diğerlerinde unitPrice >= 0
  body("items.*").custom((val: any, { req }) => {
    if (val?.productType === "menuitem") return true;
    if (typeof val?.unitPrice !== "number" || val.unitPrice < 0) {
      throw new Error(tReq(req, "validation.unitPricePositive"));
    }
    return true;
  }),

  // menu selection yapısı (opsiyoneller hariç tip kontrolleri)
  body("items.*").custom((val: any, { req }) => {
    if (val?.productType !== "menuitem") return true;
    if (!val.menu || typeof val.menu !== "object") {
      throw new Error(tReq(req, "validation.menuSelectionInvalid"));
    }
    if (val.menu.modifiers && !Array.isArray(val.menu.modifiers)) {
      throw new Error(tReq(req, "validation.menuSelectionInvalid"));
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

  // 🚚 Delivery'de shippingAddress zorunlu: street || addressLine kabul
  body().custom((body, { req }) => {
    const st = body?.serviceType || "delivery";
    if (st !== "delivery") return true;

    // addressId verildiyse form alanlarını zorunlu tutma
    if (body?.addressId) return true;

    const sa = body?.shippingAddress;
    const hasStreetOrLine = !!(sa?.street || sa?.addressLine);
    const ok =
      sa &&
      sa.name &&
      sa.phone &&
      hasStreetOrLine &&
      sa.city &&
      sa.postalCode &&
      sa.country;

    if (!ok) {
      throw new Error(tReq(req, "validation.shippingAddressRequired"));
    }
    return true;
  }),

  body("paymentMethod")
    .isIn(["cash_on_delivery", "credit_card", "paypal"])
    .withMessage((_, { req }) => tReq(req, "validation.invalidPaymentMethod")),
  body("currency").optional().isString(),
  body("deliveryFee").optional().isFloat({ min: 0 }),
  body("tipAmount").optional().isFloat({ min: 0 }),
  body("serviceFee").optional().isFloat({ min: 0 }),
  body("taxTotal").optional().isFloat({ min: 0 }),
];

export const updateOrderStatusValidator = [
  body("status")
    .isIn(["pending", "preparing", "shipped", "completed", "cancelled"])
    .withMessage((_, { req }) => tReq(req, "validation.invalidOrderStatus")),
];

export const updateShippingAddressValidator = [
  body("shippingAddress")
    .notEmpty()
    .withMessage((_, { req }) => tReq(req, "validation.shippingAddressRequired")),
  body("shippingAddress.name").optional().notEmpty(),
  body("shippingAddress.phone").optional().notEmpty(),
  body("shippingAddress.street").optional().notEmpty(),
  body("shippingAddress.addressLine").optional().notEmpty(), // 💡 yeni
  body("shippingAddress.city").optional().notEmpty(),
  body("shippingAddress.postalCode").optional().notEmpty(),
  body("shippingAddress.country").optional().notEmpty(),
];

export const adminListQueryValidator = [
  query("serviceType").optional().isIn(["delivery", "pickup", "dinein"]),
  query("status").optional().isIn(["pending", "preparing", "shipped", "completed", "cancelled"]),
];
