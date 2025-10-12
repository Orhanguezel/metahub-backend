import { Request, Response } from "express";
import { generateToken } from "@/core/middleware/auth/token";
import { setTokenCookie, clearTokenCookie } from "@/core/middleware/auth/cookie";
import { comparePasswords, hashPassword } from "@/core/middleware/auth/authUtils";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import authTranslations from "@/services/i18n";
import { RequestWithTenant } from "@/core/middleware/tenant/resolveTenant";

// ✅ Login & Token Set
// ✅ Login & Token Set
export const loginAndSetToken = async (
  req: RequestWithTenant, // veya tenantData içeren kendi genişletilmiş tipin!
  res: Response,
  userId: string,
  role: string
): Promise<string> => {
  const token = generateToken({ id: userId, role });

  setTokenCookie(res, token, req.tenantData); // <-- DÜZELTİLDİ

  logger.info(
    t("auth.token.set", req.locale || getLogLocale(), authTranslations, {
      userId,
      role,
    }),
    {
      tenant: req.tenant,
      module: "auth",
      event: "auth.login.token_set",
      status: "success",
    }
  );

  return token;
};

// ✅ Logout & Clear Token
export const logoutAndClearToken = (req: RequestWithTenant, res: Response) => {
  clearTokenCookie(res, req.tenantData); // <-- DÜZELTİLDİ

  logger.info(
    t("auth.token.cleared", req.locale || getLogLocale(), authTranslations),
    {
      tenant: req.tenant,
      module: "auth",
      event: "auth.logout.token_cleared",
      status: "success",
    }
  );
};

// ✅ Password Check
export const checkPassword = async (
  req: Request,
  inputPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  const result = await comparePasswords(inputPassword, hashedPassword);

  logger.info(
    t("auth.password.checked", req.locale || getLogLocale(), authTranslations, {
      result: String(result),
    }),
    {
      tenant: req.tenant,
      module: "auth",
      event: "auth.password.checked",
      status: "success",
    }
  );

  return result;
};

// ✅ Password Hashing
export const hashNewPassword = async (
  req: Request,
  password: string
): Promise<string> => {
  const hashed = await hashPassword(password);

  logger.info(
    t("auth.password.hashed", req.locale || getLogLocale(), authTranslations),
    {
      tenant: req.tenant,
      module: "auth",
      event: "auth.password.hashed",
      status: "success",
    }
  );

  return hashed;
};
