// src/core/utils/cookie.ts
import { Response } from "express";

const isProduction = process.env.NODE_ENV === "production";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
const COOKIE_NAME = process.env.COOKIE_NAME || "accessToken";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

if (isProduction && !COOKIE_DOMAIN) {
  throw new Error("❌ COOKIE_DOMAIN must be defined in production.");
}

export const setTokenCookie = (res: Response, token: string): void => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction, // ✅ HTTPS zorunluluğu sadece production'da aktif
    sameSite: isProduction ? "none" : "lax", // ✅ Dev'de sorun çıkmaz, prod'da cross-site desteklenir
    domain: isProduction ? COOKIE_DOMAIN : undefined, // ✅ prod'da domain zorunlu
    maxAge: COOKIE_MAX_AGE,
    path: "/", // tüm path'ler için geçerli
  });
};

export const clearTokenCookie = (res: Response): void => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    domain: isProduction ? COOKIE_DOMAIN : undefined,
    path: "/",
  });
};


