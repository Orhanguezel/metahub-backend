// src/core/utils/cookieUtils.ts
import { Response } from "express";

const isProduction = process.env.NODE_ENV === "production";
const COOKIE_NAME = process.env.COOKIE_NAME || "accessToken";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 gün

// --- Ana domaini başında nokta ile döner ---
function getTenantCookieDomain(tenantData: any): string | undefined {
  if (!isProduction) return undefined; // Local/dev'de domain tanımlama!
  const mainDomain = tenantData?.domain?.main;
  if (!mainDomain) return undefined;
  // Subdomain'leri ve www'yu otomatik ayıkla
  const coreDomain = mainDomain.replace(/^www\./, "");
  return `.${coreDomain}`;
}

// --- Cookie SET ---
export const setTokenCookie = (
  res: Response,
  token: string,
  tenantData: any
): void => {
  const domain = getTenantCookieDomain(tenantData);
  const cookieOpts: any = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    ...(domain ? { domain } : {}),
  };
  res.cookie(COOKIE_NAME, token, cookieOpts);
  if (isProduction) {
    console.log(`[Cookie-SET] Tenant: ${tenantData?.slug} | Domain: ${domain}`);
  }
};

// --- Cookie CLEAR ---
export const clearTokenCookie = (res: Response, tenantData: any): void => {
  const domain = getTenantCookieDomain(tenantData);
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    ...(domain ? { domain } : {}),
  });
  if (isProduction) {
    console.log(`[Cookie-CLEAR] Tenant: ${tenantData?.slug} | Domain: ${domain}`);
  }
};
