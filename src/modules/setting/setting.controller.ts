import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { ILogoSettingValue } from "@/modules/setting";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { getImagePath } from "@/core/utils/uploadUtils";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { completeLocales } from "@/core/utils/i18n/completeLocales";

// --- Helper: Logo dosyası temizliği (hem fs hem cloudinary)
const cleanupLogoFiles = async (logoObj?: ILogoSettingValue) => {
  for (const mode of ["light", "dark"] as const) {
    const logo = logoObj?.[mode];
    if (!logo) continue;
    if (logo.url && logo.url.startsWith("uploads")) {
      const absPath = path.join(process.cwd(), logo.url);
      if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
    }
    if (logo.publicId) {
      try {
        await cloudinary.uploader.destroy(logo.publicId);
      } catch (err) {
        logger.error("[Cloudinary Delete Error]", { error: err, publicId: logo.publicId });
      }
    }
  }
};

const getI18nTools = (req: Request) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const logContext = {
    tenant: req.tenant,
    module: "setting",
    path: req.path,
    method: req.method,
    ip: req.ip,
  };
  return { locale, t, logContext };
};

/** LOGO YÜKLEME - YENİ (MultiLang gereksiz, sadeleştirildi) */
export const upsertSettingImage = asyncHandler(async (req: Request, res: Response) => {
  const { Setting } = await getTenantModels(req);
  const { t, logContext } = getI18nTools(req);
  const { key } = req.params;

  if (!key) {
    logger.warn("Key param missing", { ...logContext, event: "setting.upload", status: "fail" });
     res.status(400).json({ success: false, message: t("setting.error.missing") });return;
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const light = files?.lightFile?.[0];
  const dark = files?.darkFile?.[0];

  if (!light && !dark) {
     res.status(400).json({ success: false, message: t("setting.error.missingImage") });return;
  }

  let setting = await Setting.findOne({ key, tenant: req.tenant });

  // Eski logo dosyalarını temizle
  if (setting?.value && typeof setting.value === "object") {
    await cleanupLogoFiles(setting.value as ILogoSettingValue);
  }

  // Yeni logo objesi oluştur
  const newLogo: ILogoSettingValue = {};
  if (light) newLogo.light = { url: getImagePath(light), publicId: (light as any).public_id };
  if (dark) newLogo.dark = { url: getImagePath(dark), publicId: (dark as any).public_id };

  if (setting) {
    setting.value = newLogo;
    await setting.save();
  } else {
    setting = await Setting.create({
      key,
      value: newLogo,
      isActive: true,
      tenant: req.tenant,
    });
  }

  logger.info(t("setting.upload.success"), {
    ...logContext, event: "setting.upload", status: "success", key,
  });
  res.status(200).json({ success: true, message: t("setting.upload.success"), data: setting });
});

/** LOGO GÜNCELLEME (aynı şekilde sade) */
export const updateSettingImage = asyncHandler(async (req: Request, res: Response) => {
  const { Setting } = await getTenantModels(req);
  const { t, logContext } = getI18nTools(req);
  const { key } = req.params;

  if (!key) {
    logger.warn("Key param missing", { ...logContext, event: "setting.updateImage", status: "fail" });
     res.status(400).json({ success: false, message: t("setting.error.missing") });return;
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const light = files?.lightFile?.[0];
  const dark = files?.darkFile?.[0];

  if (!light && !dark) {
    logger.warn("No image files provided", { ...logContext, event: "setting.updateImage", status: "fail", key });
     res.status(400).json({ success: false, message: t("setting.error.missingImage") });return;
  }

  const setting = await Setting.findOne({ key, tenant: req.tenant });
  if (!setting) {
    logger.warn("Setting not found", { ...logContext, event: "setting.updateImage", status: "fail", key });
     res.status(404).json({ success: false, message: t("setting.error.notFound") });return;
  }

  // Eski dosyaları temizle
  if (setting.value && typeof setting.value === "object") {
    const val = setting.value as ILogoSettingValue;
    if (light && val.light) await cleanupLogoFiles({ light: val.light });
    if (dark && val.dark) await cleanupLogoFiles({ dark: val.dark });
  }

  const newLogo: ILogoSettingValue = { ...(setting.value as ILogoSettingValue) };
  if (light) newLogo.light = { url: getImagePath(light), publicId: (light as any).public_id };
  if (dark) newLogo.dark = { url: getImagePath(dark), publicId: (dark as any).public_id };

  setting.value = newLogo;
  await setting.save();

  logger.info(t("setting.update.success"), {
    ...logContext, event: "setting.updateImage", status: "success", key,
  });

  res.status(200).json({ success: true, message: t("setting.update.success"), data: setting });
});

/** SETTING SİLME */
export const deleteSetting = asyncHandler(async (req, res) => {
  const { Setting } = await getTenantModels(req);
  const { t, logContext } = getI18nTools(req);
  const { key } = req.params;

  if (!key) {
    logger.warn("Key param missing", { ...logContext, event: "setting.delete", status: "fail" });
     res.status(400).json({ success: false, message: t("setting.error.missing") });return;
  }

  const setting = await Setting.findOneAndDelete({ key, tenant: req.tenant });
  if (!setting) {
    logger.warn("Setting not found", { ...logContext, event: "setting.delete", status: "fail", key });
     res.status(404).json({ success: false, message: t("setting.error.notFound") });return;
  }

  if (setting.value && typeof setting.value === "object") {
    await cleanupLogoFiles(setting.value as ILogoSettingValue);
  }

  logger.warn(t("setting.delete.success"), {
    ...logContext, event: "setting.delete", status: "success", key,
  });
  res.status(200).json({ success: true, message: t("setting.delete.success") });
});


export const upsertSetting = asyncHandler(async (req, res) => {
  const { Setting } = await getTenantModels(req);
  const { t, logContext } = getI18nTools(req);
  const { key, value, isActive = true } = req.body;

  if (!key || value === undefined || value === null) {
    logger.warn(t("setting.error.missing"), { ...logContext, event: "setting.create", status: "fail" });
    res.status(400).json({ success: false, message: t("setting.error.missing") }); return;
  }

  const trimmedKey = key.trim();
  let setting = await Setting.findOne({ key: trimmedKey, tenant: req.tenant });

  // Tüm TranslatedLabel beklenen key’ler burada olmalı (gerekiyorsa çoğalt)
  const multilanguageKeys = [
    "site_title", "footer_label", "footer_rights", "meta_title", "meta_description",
    "footer_about_links", "footer_services_links", "footer_contact",
    "navbar_main_links", "navbar_logo_text"
    // başka ek anahtarlar varsa ekle
  ];

  // Recursive olarak her label için completeLocales uygula
  function normalizeRecursive(val: any): any {
    if (Array.isArray(val)) return val.map(normalizeRecursive);
    if (typeof val === "object" && val !== null) {
      // Eğer en az bir locale içeriyorsa, completeLocales uygula
      const hasAtLeastOneLocale = ["tr", "en", "de", "fr", "es", "pl"].some(
        (lang) => Object.prototype.hasOwnProperty.call(val, lang)
      );
      if (hasAtLeastOneLocale) {
        return completeLocales(val);
      }
      // Nested objelerde de uygula
      const newObj: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        newObj[k] = normalizeRecursive(v);
      }
      return newObj;
    }
    return val;
  }

  let normalizedValue = value;

  if (
    typeof value === "object" &&
    multilanguageKeys.includes(trimmedKey)
  ) {
    normalizedValue = normalizeRecursive(value);
  }

  // Tema seçimi kontrolü (future-proof)
  if (trimmedKey === "site_template") {
    const themeSetting = await Setting.findOne({ key: "available_themes", tenant: req.tenant });
    const availableThemes = Array.isArray(themeSetting?.value) ? themeSetting.value : [];
    if (!availableThemes.includes(value)) {
      logger.warn("Invalid theme selection", { ...logContext, key: trimmedKey, event: "setting.create", status: "fail" });
      res.status(422).json({ success: false, message: t("setting.error.invalidTheme") }); return;
    }
  }

  if (setting) {
    setting.value = normalizedValue;
    setting.isActive = typeof isActive === "boolean" ? isActive : setting.isActive;
    await setting.save();
    logger.info(t("setting.update.success"), { ...logContext, event: "setting.update", status: "success", key });
    res.status(200).json({ success: true, message: t("setting.update.success"), data: setting }); return;
  } else {
    setting = await Setting.create({
      key: trimmedKey,
      value: normalizedValue,
      isActive,
      tenant: req.tenant,
    });
    logger.info(t("setting.create.success"), { ...logContext, event: "setting.create", status: "success", key });
    res.status(201).json({ success: true, message: t("setting.create.success"), data: setting }); return;
  }
});



/** TÜM AYARLARI ÇEK */
export const getAllSettings = asyncHandler(async (req: Request, res: Response) => {
  const { Setting } = await getTenantModels(req);
  const settings = await Setting.find({ tenant: req.tenant }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: settings });
});

/** TEK AYAR ÇEK */
export const getSettingByKey = asyncHandler(async (req: Request, res: Response) => {
  const { Setting } = await getTenantModels(req);
  const { t, logContext } = getI18nTools(req);
  const { key } = req.params;

  if (!key?.trim()) {
     res.status(400).json({ success: false, message: t("setting.error.missing") });return;
  }

  const setting = await Setting.findOne({ key: key.trim(), tenant: req.tenant });
  if (!setting) {
     res.status(404).json({ success: false, message: t("setting.error.notFound") });return;
  }

  res.status(200).json({ success: true, data: setting });
});
