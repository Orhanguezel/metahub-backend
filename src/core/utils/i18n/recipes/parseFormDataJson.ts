import { Request, Response, NextFunction } from "express";

export function parseFormDataJson(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === "string") {
        try {
          const parsed = JSON.parse(req.body[key]);
          if (parsed && typeof parsed === "object") {
            req.body[key] = parsed;
          }
        } catch (error) {}
      }
    }
  }

  next();
}
