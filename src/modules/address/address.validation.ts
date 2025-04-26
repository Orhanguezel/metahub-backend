import { body, param } from "express-validator";
import { isValidObjectId } from "@/core/utils/validation";

// ➕ Adres oluşturma validasyonu
export const validateAddressCreation = [
  body("street")
    .isString()
    .isLength({ min: 3, max: 50 })
    .withMessage("Street must be between 3 and 50 characters."),
  body("houseNumber")
    .isString()
    .isLength({ min: 1, max: 10 })
    .withMessage("House number must be between 1 and 10 characters."),
  body("city")
    .isString()
    .isLength({ min: 2, max: 50 })
    .withMessage("City must be between 2 and 50 characters."),
  body("zipCode")
    .isString()
    .isLength({ min: 4, max: 10 })
    .withMessage("Zip code must be between 4 and 10 characters."),
  body("label.tr")
    .notEmpty()
    .withMessage("Turkish label is required."),
  body("label.en")
    .notEmpty()
    .withMessage("English label is required."),
  body("label.de")
    .notEmpty()
    .withMessage("German label is required."),
];

// ✏️ Adres güncelleme validasyonu
export const validateAddressUpdate = [
  body("street")
    .optional()
    .isString()
    .isLength({ min: 3, max: 50 })
    .withMessage("Street must be between 3 and 50 characters."),
  body("houseNumber")
    .optional()
    .isString()
    .isLength({ min: 1, max: 10 })
    .withMessage("House number must be between 1 and 10 characters."),
  body("city")
    .optional()
    .isString()
    .isLength({ min: 2, max: 50 })
    .withMessage("City must be between 2 and 50 characters."),
  body("zipCode")
    .optional()
    .isString()
    .isLength({ min: 4, max: 10 })
    .withMessage("Zip code must be between 4 and 10 characters."),
];

// 🔍 ID validasyonu
export const validateAddressId = [
  param("id")
    .custom((value) => isValidObjectId(value))
    .withMessage("Invalid address ID."),
];
