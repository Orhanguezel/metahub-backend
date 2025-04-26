import { Request, Response, NextFunction } from "express";
import { validationResult, param } from "express-validator";

// 📌 Genel request doğrulama
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const extractedErrors: { [key: string]: string }[] = [];

    errors.array().forEach((err) => {
      if ("param" in err && typeof err.param === "string") {
        const param = err.param as string;
        extractedErrors.push({ [param]: err.msg });
      }
    });

    res.status(422).json({
      message: "Validation error.",
      errors: extractedErrors,
    });

    return;
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

