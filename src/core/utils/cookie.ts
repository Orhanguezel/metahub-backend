import { Response } from "express";

const cookieDomain =
  process.env.NODE_ENV === "production" ? ".ensotek.de" : undefined;

  export const setTokenCookie = (res: Response, token: string): void => {
    res.cookie("accessToken", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
      secure: process.env.NODE_ENV === "production",    
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
    });
  };
  

export const clearTokenCookie = (res: Response): void => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    domain: cookieDomain,
  });
};
