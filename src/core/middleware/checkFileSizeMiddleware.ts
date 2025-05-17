import { Request, Response, NextFunction } from "express";

export const checkFileSizeMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const files = (req.files as Express.Multer.File[]) || [];
  const maxSize = req.uploadSizeLimit || 20 * 1024 * 1024;

  for (const file of files) {
    if (file.size > maxSize) {
      res.status(400).json({
        success: false,
        message: `File ${file.originalname} exceeds the limit of ${(maxSize / (1024 * 1024)).toFixed(2)} MB`,
      });
      return;
    }
  }

  next();
};
