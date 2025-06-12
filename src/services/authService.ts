// src/services/authService.ts
import { Response } from "express";
import { generateToken } from "@/core/utils/token";
import { setTokenCookie, clearTokenCookie } from "@/core/utils/cookie";
import { comparePasswords, hashPassword } from "@/core/utils/authUtils";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import authTranslations from "@/services/i18n"; // veya kendi i18n dosyan

export const loginAndSetToken = async (
  res: Response,
  userId: string,
  role: string
): Promise<string> => {
  const token = generateToken({ id: userId, role });
  setTokenCookie(res, token);

  logger.info(
    t("auth.token.set", getLogLocale(), authTranslations, { userId, role })
  );

  return token;
};

export const logoutAndClearToken = (res: Response) => {
  clearTokenCookie(res);

  logger.info(t("auth.token.cleared", getLogLocale(), authTranslations));
};

export const checkPassword = async (
  inputPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  const result = await comparePasswords(inputPassword, hashedPassword);

  logger.info(
    t("auth.password.checked", getLogLocale(), authTranslations, {
      result: String(result),
    })
  );

  return result;
};

export const hashNewPassword = async (password: string): Promise<string> => {
  const hashed = await hashPassword(password);

  logger.info(t("auth.password.hashed", getLogLocale(), authTranslations));

  return hashed;
};
