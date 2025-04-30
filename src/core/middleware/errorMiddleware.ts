import { Request, Response, NextFunction } from "express";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error(err.stack);

  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let response: any = {
    message: err.message || "Internal Server Error",
  };

  // Validation hatalarını kontrol et: errors array'i ve içinde 'param' ve 'msg' varsa
  if (Array.isArray(err.errors) && err.errors.every((e) => e.param && e.msg)) {
    statusCode = 422; // Unprocessable Entity
    response = {
      message: "Validation Error",
      errors: err.errors.map((error: any) => ({
        field: error.param,
        message: error.msg,
      })),
    };
  }

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

