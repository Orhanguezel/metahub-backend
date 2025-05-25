import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Setting, ILogoSettingValue } from "@/modules/setting";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { getImagePath } from "@/core/utils/uploadUtils";

const ENV = process.env.APP_ENV || "ensotek";
const FOLDER_KEY = "setting";
const FOLDER = "setting-images";

// 🔗 Eski logo dosyalarını hem localden hem Cloudinary'den siler
async function cleanupLogoFiles(logoObj?: ILogoSettingValue) {
  for (const mode of ["light", "dark"] as const) {
    const logo = logoObj?.[mode];
    if (!logo) continue;

    // Local dosya ise
    if (logo.url && logo.url.startsWith("uploads")) {
      const absPath = path.join(process.cwd(), logo.url);
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath);
      }
    }
    // Cloudinary ise
    if (logo.publicId) {
      try {
        await cloudinary.uploader.destroy(logo.publicId);
      } catch (err) {
        console.error(`[Cloudinary Delete] ${logo.publicId}:`, err);
      }
    }
  }
}

// 🎯 Upload (POST): /setting/upload/:key
export const upsertSettingImage = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  if (!key) throw new Error("Key param is required.");

  // Multer field'ları: lightFile/darkFile şeklinde (cloudinary ise .path, .filename yok!)
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const light = files?.lightFile?.[0];
  const dark = files?.darkFile?.[0];

  if (!light && !dark) throw new Error("At least one of lightFile or darkFile is required.");

  let setting = await Setting.findOne({ key });

  // 🔴 Önce eski dosyaları temizle!
  if (setting && setting.value && typeof setting.value === "object") {
    await cleanupLogoFiles(setting.value as ILogoSettingValue);
  }

  // Yeni logoları kaydet
  const newLogo: ILogoSettingValue = {};

  if (light) {
    newLogo.light = {
      url: getImagePath(light), // Cloudinary ise path, local ise dosya yolu
      publicId: (light as any).public_id || undefined,
      thumbnail: undefined, // İstersen burada otomatik üretebilirsin
      webp: undefined,      // Aynı şekilde
    };
  }

  if (dark) {
    newLogo.dark = {
      url: getImagePath(dark),
      publicId: (dark as any).public_id || undefined,
      thumbnail: undefined,
      webp: undefined,
    };
  }

  if (setting) {
    setting.value = newLogo;
    await setting.save();
  } else {
    setting = await Setting.create({
      key,
      value: newLogo,
      isActive: true,
    });
  }

  res.status(200).json({
    success: true,
    message: "Logos uploaded and setting saved successfully.",
    data: setting,
  });
});

// 🎯 Update (PUT): /setting/upload/:key
export const updateSettingImage = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  if (!key) throw new Error("Key param is required.");

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const light = files?.lightFile?.[0];
  const dark = files?.darkFile?.[0];

  if (!light && !dark) throw new Error("At least one of lightFile or darkFile is required.");

  const setting = await Setting.findOne({ key });
  if (!setting) throw new Error("Setting not found for the provided key.");

  // 🔴 Eski dosyaları temizle (sadece değişenler için)
  if (setting.value && typeof setting.value === "object") {
    const val = setting.value as ILogoSettingValue;
    if (light && val.light) await cleanupLogoFiles({ light: val.light });
    if (dark && val.dark) await cleanupLogoFiles({ dark: val.dark });
  }

  const newLogo: ILogoSettingValue = { ...(setting.value as ILogoSettingValue) };

  if (light) {
    newLogo.light = {
      url: getImagePath(light),
      publicId: (light as any).public_id || undefined,
      thumbnail: undefined,
      webp: undefined,
    };
  }
  if (dark) {
    newLogo.dark = {
      url: getImagePath(dark),
      publicId: (dark as any).public_id || undefined,
      thumbnail: undefined,
      webp: undefined,
    };
  }

  setting.value = newLogo;
  await setting.save();

  res.status(200).json({
    success: true,
    message: "Logos updated successfully.",
    data: setting,
  });
});

// 🎯 Delete Setting by Key
export const deleteSetting = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  if (!key) throw new Error("Key parameter is required for deletion.");

  const setting = await Setting.findOneAndDelete({ key });

  if (!setting) {
    res.status(404);
    throw new Error("Setting not found with the provided key.");
  }

  // Eğer value bir logo ise, logoları da sil!
  if (setting.value && typeof setting.value === "object") {
    await cleanupLogoFiles(setting.value as ILogoSettingValue);
  }

  res.status(200).json({
    success: true,
    message: `Setting '${key}' has been deleted successfully.`,
  });
});



// 🎯 Create or Update Setting (JSON)
export const upsertSetting = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { key, value, isActive = true } = req.body;

  if (!key || value === undefined || value === null) {
    res.status(400).json({
      success: false,
      message: "Key and value are required.",
    });
    return;
  }

  const trimmedKey = key.trim();

  let finalValue: any = value;

  // ✅ Özel kontrol: site_template için validasyon
  if (trimmedKey === "site_template") {
    const availableThemesSetting = await Setting.findOne({ key: "available_themes" });
    const availableThemes = Array.isArray(availableThemesSetting?.value)
      ? availableThemesSetting.value
      : [];

    if (!availableThemes.includes(value)) {
      res.status(422);
      throw new Error(`Selected theme '${value}' is not listed in available themes.`);
    }
  }

  let setting = await Setting.findOne({ key: trimmedKey });

  if (setting) {
    setting.value = finalValue;
    setting.isActive = typeof isActive === "boolean" ? isActive : setting.isActive;
    await setting.save();

    res.status(200).json({
      success: true,
      message: "Setting updated successfully.",
      data: setting,
    });
  } else {
    const newSetting = new Setting({
      key: trimmedKey,
      value: finalValue,
      isActive,
    });
    await newSetting.save();

    res.status(201).json({
      success: true,
      message: "Setting created successfully.",
      data: newSetting,
    });
  }
});



// 🎯 Get All Settings
export const getAllSettings = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const settings = await Setting.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: settings,
  });
});

// 🎯 Get Setting by Key
export const getSettingByKey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { key } = req.params;

  if (!key?.trim()) {
    res.status(400);
    throw new Error("Key parameter is required.");
  }

  const setting = await Setting.findOne({ key: key.trim() });

  if (!setting) {
    res.status(404);
    throw new Error("Setting not found with the provided key.");
  }

  res.status(200).json({
    success: true,
    data: setting,
  });
});
