// src/core/utils/cookieUtils.ts
import { Response } from "express";
import tenantDomains from "@/core/middleware/tenant/tenants.json";

const isProduction = process.env.NODE_ENV === "production";
const COOKIE_NAME = process.env.COOKIE_NAME || "accessToken";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 gün

// ✅ Tenant'a göre domain çözümleyici
export const getCookieDomain = (tenant: string): string | undefined => {
  const domain = tenantDomains[tenant];
  if (!isProduction) return undefined; // local ortamda domain tanımsız olmalı
  return domain;
};

// ✅ Çerez yazıcı
export const setTokenCookie = (
  res: Response,
  token: string,
  tenant: string
): void => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    domain: getCookieDomain(tenant),
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
};

// ✅ Çerez temizleyici
export const clearTokenCookie = (res: Response, tenant?: string): void => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    domain: getCookieDomain(tenant || "metahub"), // fallback tenant
  });
};
