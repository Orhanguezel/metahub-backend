// src/core/utils/cookieUtils.ts
import { Response } from "express";

const isProduction = process.env.NODE_ENV === "production";
const COOKIE_NAME = process.env.COOKIE_NAME || "accessToken";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 gün

// --- Ana domaini başında nokta ile döner. Sadece main kullanılır! ---
function getTenantCookieDomain(tenantData: any): string | undefined {
  if (!isProduction) return undefined; // Lokal/dev ortamında domain ayarlanmaz
  const rawDomain = tenantData?.domain?.main;
  if (!rawDomain) return undefined;
  // Nokta ile başlat (cross-subdomain ve frontend/backend uyumu için)
  return rawDomain.startsWith(".") ? rawDomain : `.${rawDomain}`;
}

// --- Cookie setlerken sadece main'den, başında nokta ile! ---
export const setTokenCookie = (
  res: Response,
  token: string,
  tenantData: any
): void => {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieOpts: any = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
  if (isProduction) {
    const domain = getTenantCookieDomain(tenantData);
    if (domain) cookieOpts.domain = domain;
  }
  res.cookie(COOKIE_NAME, token, cookieOpts);
};

export const clearTokenCookie = (res: Response, tenantData: any): void => {
  const domain = getTenantCookieDomain(tenantData);
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    domain,
    path: "/",
  });

  console.log(
    `[Cookie] Set: name=${COOKIE_NAME}, domain=${domain}, isProduction=${isProduction}`
  );
};
