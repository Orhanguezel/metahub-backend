import { Response } from "express";

const isProduction = process.env.NODE_ENV === "production";
const COOKIE_NAME = process.env.COOKIE_NAME || "accessToken";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 gün

const domainMap = {
  metahub: ".guezelwebdesign.com",
  anastasia: ".koenigsmassage.com",
  ensotek: ".ensotek.de",
};

// 🔁 Tenant’a göre domain
export const getCookieDomain = (tenant: string): string =>
  domainMap[tenant] || ".guezelwebdesign.com";

// ✅ Çerez yazma
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

// ✅ Çerez silme
export const clearTokenCookie = (res: Response, tenant?: string): void => {
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    domain: tenant ? getCookieDomain(tenant) : undefined,
  } as const;

  res.clearCookie(COOKIE_NAME, options);
};
