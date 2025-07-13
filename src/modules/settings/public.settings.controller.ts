import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

// --- PUBLIC: Tüm settings (read only) ---
export const getAllSettings = asyncHandler(async (req, res) => {
  const { Settings } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const settings = await Settings.find({
    tenant: req.tenant,
    isActive: true,
  }).sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: settings });
  return;
});

// --- PUBLIC: Tek setting (read only) ---
export const getSettingByKey = asyncHandler(async (req, res) => {
  const { Settings } = await getTenantModels(req);
  const { key } = req.params;
  const locale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  if (!key?.trim()) {
    res.status(400).json({ success: false, message: t("setting.error.missing") });
    return;
  }

  const settingKey = key.trim();
  const settings = await Settings.findOne({
    key: settingKey,
    tenant: req.tenant,
    isActive: true,
  });

  if (!settings) {
    res.status(404).json({ success: false, message: t("setting.error.notFound") });
    return;
  }

  res.status(200).json({ success: true, data: settings });
  return;
});
