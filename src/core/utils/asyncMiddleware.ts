// utils/asyncMiddleware.ts
import { Request, Response, NextFunction, RequestHandler } from "express";

export function asyncMiddleware(fn: any): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
