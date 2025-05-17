import { Request, Response, NextFunction } from "express";

export function transformNestedFields(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    fields.forEach((field) => {
      if (typeof req.body[field] === "string") {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch {
          console.warn(`⚠️ Field '${field}' could not be parsed as JSON`);
        }
      }
    });
    next();
  };
}
