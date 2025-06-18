import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import {
  isValidObjectId,
  getUserOrFail,
  isValidRole,
} from "@/core/utils/validation";

import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import userTranslations from "@/modules/users/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// Kısayol fonksiyon
function userT(
  key: string,
  locale: SupportedLocale,
  vars?: Record<string, string | number>
) {
  return t(key, locale, userTranslations, vars);
}

// ✅ Kullanıcı durumunu aktif/pasif olarak değiştir
export const toggleUserStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();

    logger.debug(
      `[Admin] toggleUserStatus called with id=${id} | locale=${locale}`
    );

    if (!isValidObjectId(id)) {
      logger.warn(`[Admin] Invalid user ID: ${id}`);
      res.status(400).json({
        success: false,
        message: userT("admin.users.invalidId", locale),
      });
      return;
    }

    const user = await getUserOrFail(id, res);
    if (!user) {
      logger.warn(`[Admin] User not found: ${id}`);
      return;
    }

    user.isActive = !user.isActive;
    await user.save();

    logger.info(
      `[Admin] User status changed: ${user.email} | isActive=${user.isActive}`
    );

    res.status(200).json({
      success: true,
      message: userT(
        user.isActive ? "admin.users.activated" : "admin.users.blocked",
        locale
      ),
      userId: String(user._id),
      isActive: user.isActive,
    });
  }
);

// ✅ Kullanıcının rolünü güncelle
export const updateUserRole = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { role } = req.body;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { User } = await getTenantModels(req);

    logger.debug(
      `[Admin] updateUserRole called with id=${id} | role=${role} | locale=${locale}`
    );

    if (!isValidObjectId(id)) {
      logger.warn(`[Admin] Invalid user ID: ${id}`);
      res.status(400).json({
        success: false,
        message: userT("admin.users.invalidId", locale),
      });
      return;
    }

    if (!isValidRole(role)) {
      logger.warn(`[Admin] Invalid role: ${role}`);
      res.status(400).json({
        success: false,
        message: userT("admin.users.invalidRole", locale),
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      id.trim(),
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      logger.warn(`[Admin] User not found for role update: ${id}`);
      res.status(404).json({
        success: false,
        message: userT("admin.users.notFound", locale),
      });
      return;
    }

    logger.info(`[Admin] User role updated: ${user.email} | role=${user.role}`);

    res.status(200).json({
      success: true,
      message: userT("admin.users.roleUpdated", locale),
      user,
    });
  }
);
