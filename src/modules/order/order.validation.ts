import { body } from "express-validator";

// --- Sipariş oluşturma validasyonu ---
export const createOrderValidator = [
  // items dizisi
  body("items")
    .isArray({ min: 1 })
    .withMessage("Order must have at least one item."),

  // items içindeki her bir ürünün ObjectId ve model zorunluluğu
  body("items.*.product")
    .notEmpty()
    .withMessage("Each item must have a valid product ID."),

  body("items.*.productModel")
    .isIn(["Bike", "Ensotekprod"])
    .withMessage("Each item must have a valid product model (Bike or Ensotekprod)."),

  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Each item must have a quantity of at least 1."),

  body("items.*.unitPrice")
    .isFloat({ min: 0 })
    .withMessage("Each item must have a positive unit price."),

  body("items.*.tenant")
    .notEmpty()
    .withMessage("Each item must have a tenant identifier."),

  // shippingAddress alanları
  body("shippingAddress.name")
    .notEmpty()
    .withMessage("Shipping name is required."),

  body("shippingAddress.phone")
    .notEmpty()
    .withMessage("Shipping phone is required."),

  body("shippingAddress.street")
    .notEmpty()
    .withMessage("Shipping street is required."),

  body("shippingAddress.city")
    .notEmpty()
    .withMessage("Shipping city is required."),

  body("shippingAddress.postalCode")
    .notEmpty()
    .withMessage("Shipping postal code is required."),

  body("shippingAddress.country")
    .notEmpty()
    .withMessage("Shipping country is required."),

  body("shippingAddress.tenant")
    .notEmpty()
    .withMessage("Shipping address must have a tenant identifier."),

  // totalPrice zorunlu ve >=0
  body("totalPrice")
    .isFloat({ min: 0 })
    .withMessage("Total price must be a positive number."),

  // paymentMethod enum
  body("paymentMethod")
    .isIn(["cash_on_delivery", "credit_card", "paypal"])
    .withMessage("Invalid payment method."),

  // status zorunlu değil (backend default "pending" atanıyor)
];

// Sipariş durumu güncelleme validasyonu
export const updateOrderStatusValidator = [
  body("status")
    .isIn(["pending", "preparing", "shipped", "completed", "cancelled"])
    .withMessage("Invalid order status."),
];

// Sipariş adresi güncelleme validasyonu
export const updateShippingAddressValidator = [
  body("shippingAddress.name")
    .optional()
    .notEmpty()
    .withMessage("Shipping name cannot be empty."),
  body("shippingAddress.phone")
    .optional()
    .notEmpty()
    .withMessage("Shipping phone cannot be empty."),
  body("shippingAddress.street")
    .optional()
    .notEmpty()
    .withMessage("Shipping street cannot be empty."),
  body("shippingAddress.city")
    .optional()
    .notEmpty()
    .withMessage("Shipping city cannot be empty."),
  body("shippingAddress.postalCode")
    .optional()
    .notEmpty()
    .withMessage("Shipping postal code cannot be empty."),
  body("shippingAddress.country")
    .optional()
    .notEmpty()
    .withMessage("Shipping country cannot be empty."),
  body("shippingAddress.tenant")
    .optional()
    .notEmpty()
    .withMessage("Shipping address must have a tenant identifier."),
];




