import { Request, Response, NextFunction } from "express";

export const checkFileSizeMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Hem tekli hem çoklu desteği
  const files: Express.Multer.File[] = [];
  if (Array.isArray(req.files)) files.push(...(req.files as Express.Multer.File[]));
  else if (typeof req.files === "object" && req.files !== null) {
    Object.values(req.files).forEach(arr => files.push(...(arr as Express.Multer.File[])));
  } else if (req.file) files.push(req.file);

  const maxSize = req.uploadSizeLimit || 20 * 1024 * 1024;

  for (const file of files) {
    if (file.size > maxSize) {
      console.warn(`[FILE SIZE] File too large: ${file.originalname} (${file.size} bytes)`);
      res.status(400).json({
        success: false,
        message: `File ${file.originalname} exceeds the limit of ${(maxSize / (1024 * 1024)).toFixed(2)} MB.`,
      });
      return;
    }
  }

  next();
};

export default checkFileSizeMiddleware;

