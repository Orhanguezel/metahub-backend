// src/core/utils/cookieUtils.ts
import { Response } from "express";

const isProduction = process.env.NODE_ENV === "production";
const COOKIE_NAME = process.env.COOKIE_NAME || "accessToken";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 gün

// ✅ Çerez yazıcı

// tenantData parametresi zorunlu!
export const setTokenCookie = (
  res: Response,
  token: string,
  tenant: any // Tenant kaydı (ör. req.tenantData)
): void => {
  // Ana domaini al (başında nokta olması cross-domain için önerilir)
  const mainDomain = tenant?.domain?.main
    ? "." + tenant.domain.main.replace(/^\./, "")
    : undefined;

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    domain: isProduction ? mainDomain : undefined,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
};

export const clearTokenCookie = (res: Response, tenant: any): void => {
  const mainDomain = tenant?.domain?.main
    ? "." + tenant.domain.main.replace(/^\./, "")
    : undefined;

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    domain: isProduction ? mainDomain : undefined,
    path: "/",
  });
};
