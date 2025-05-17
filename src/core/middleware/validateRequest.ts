import { Request, Response, NextFunction } from "express";
import { validationResult, param } from "express-validator";

// Tüm parametre tiplerinden gelen hataları işler: body, query, param, etc.
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(422).json({
      message: "Validation error.",
      errors: errors.array(), 
    });
    return 
  }

  next();
};

// 📌 ObjectId için özel doğrulama
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

