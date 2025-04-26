import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateCreateBooking = [
  body("name").notEmpty().withMessage("Name is required."),
  body("email").isEmail().withMessage("Valid email is required."),
  body("serviceType").notEmpty().withMessage("Service type is required."),
  body("date").notEmpty().withMessage("Date is required."),
  body("time").notEmpty().withMessage("Time is required."),
  body("service").isMongoId().withMessage("Service ID must be valid."),
  validateRequest,
];

export const validateUpdateBookingStatus = [
  body("status")
    .isIn(["pending", "confirmed", "cancelled"])
    .withMessage("Status must be pending, confirmed or cancelled."),
  validateRequest,
];

export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];
