// src/utils/authHelpers.ts

import { Request } from "express";

export const getTokenFromRequest = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  const tokenFromCookie = req.cookies?.accessToken || null;

  return tokenFromHeader || tokenFromCookie;
};
