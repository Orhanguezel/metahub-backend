// src/core/utils/cookie.ts
import { Response } from "express";

const isProduction = process.env.NODE_ENV === "production";
const COOKIE_NAME = process.env.COOKIE_NAME || "accessToken";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export const setTokenCookie = (res: Response, token: string): void => {
  if (isProduction) {
    // PROD için: domain, secure, sameSite 'none'
    const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: COOKIE_DOMAIN,
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  } else {
    // DEV için: secure=false, sameSite='lax', domain=undefined
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }
};

export const clearTokenCookie = (res: Response): void => {
  if (isProduction) {
    const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: COOKIE_DOMAIN,
      path: "/",
    });
  } else {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  }
};
