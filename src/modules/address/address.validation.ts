import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";


// 📦 Adresler validasyonu (me/addresses)
export const validateUpdateAddresses = [
  body("addresses")
    .isArray({ min: 1 })
    .withMessage("Addresses must be an array with at least 1 item."),
  validateRequest,
];

// ✅ Tek adres validasyonu
export const validateAddress = [
  body("street")
    .trim()
    .notEmpty()
    .withMessage("Street is required.")
    .isString()
    .withMessage("Street must be a string."),
  body("houseNumber")
    .trim()
    .notEmpty()
    .withMessage("House number is required.")
    .isString()
    .withMessage("House number must be a string."),
  body("city")
    .trim()
    .notEmpty()
    .withMessage("City is required.")
    .isString()
    .withMessage("City must be a string."),
  body("zipCode")
    .trim()
    .notEmpty()
    .withMessage("Zip code is required.")
    .isString()
    .withMessage("Zip code must be a string."),
];


// 🔍 ID validasyonu
export const validateAddressId = [
  param("id").isMongoId().withMessage("Invalid address ID."),
  validateRequest,
];