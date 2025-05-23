import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Create Booking — Public
export const validateCreateBooking = [
  body("name")
    .notEmpty()
    .isObject()
    .withMessage("Name must be an object with tr, en, de values."),
  body("name.tr")
    .notEmpty()
    .isString()
    .withMessage("Name.tr is required and must be a string."),
  body("name.en")
    .notEmpty()
    .isString()
    .withMessage("Name.en is required and must be a string."),
  body("name.de")
    .notEmpty()
    .isString()
    .withMessage("Name.de is required and must be a string."),

  body("email")
    .isEmail()
    .withMessage("Valid email is required."),
  body("phone")
    .optional()
    .isString()
    .withMessage("Phone must be a string."),
  body("serviceType")
    .notEmpty()
    .isString()
    .withMessage("Service type is required."),
  body("note")
    .optional()
    .isString()
    .withMessage("Note must be a string."),
  body("date")
    .notEmpty()
    .isISO8601()
    .withMessage("Valid date is required (YYYY-MM-DD)."),
  body("time")
    .notEmpty()
    .matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Time must be in HH:mm format."),
  body("service")
    .isMongoId()
    .withMessage("Service ID must be a valid MongoDB ObjectId."),
  body("durationMinutes")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Duration must be a positive integer."),
  body("language")
    .notEmpty()
    .isIn(["tr", "en", "de"])
    .withMessage("Language must be one of tr, en or de."),
  validateRequest,
];

// ✅ Status Update — Admin
export const validateUpdateBookingStatus = [
  body("status")
    .isIn(["pending", "confirmed", "cancelled"])
    .withMessage("Status must be pending, confirmed or cancelled."),
  validateRequest,
];

// ✅ ID Validation
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];
