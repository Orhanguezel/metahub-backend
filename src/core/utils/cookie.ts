// src/core/utils/cookieUtils.ts
import { Response } from "express";

const isProduction = process.env.NODE_ENV === "production";
const COOKIE_NAME = process.env.COOKIE_NAME || "accessToken";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 gün

// ✅ TenantData'dan domaini düzgünce alır (başında nokta ile)
function getTenantCookieDomain(tenantData: any): string | undefined {
  if (!isProduction) return undefined; // Lokal ortamda domain ayarlanmaz
  const rawDomain = tenantData?.domain?.main;
  if (!rawDomain) return undefined;
  // Nokta ile başlat (cross-subdomain için)
  return rawDomain.startsWith(".") ? rawDomain : `.${rawDomain}`;
}

// ✅ Token cookie set
export const setTokenCookie = (
  res: Response,
  token: string,
  tenantData: any // Tenant verisi (örn. req.tenantData)
): void => {
  const domain = getTenantCookieDomain(tenantData);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    domain,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
};

// ✅ Token cookie clear
export const clearTokenCookie = (
  res: Response,
  tenantData: any // Tenant verisi (örn. req.tenantData)
): void => {
  const domain = getTenantCookieDomain(tenantData);
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    domain,
    path: "/",
  });
};
