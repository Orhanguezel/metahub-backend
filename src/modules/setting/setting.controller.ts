import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Setting } from "@/modules/setting";
import fs from "fs";
import path from "path";

// ✅ LOGO TYPE (navbar_logos, footer_logos için ortak yapı)
type LogoSettingValue = { light?: string; dark?: string };

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

// 🎯 Upload & Create Setting Image (POST)
export const upsertSettingImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { key } = req.params;

  if (!key?.trim()) {
    res.status(400);
    throw new Error("Key parameter is required.");
  }

  const trimmedKey = key.trim();
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const lightFile = files?.lightFile?.[0];
  const darkFile = files?.darkFile?.[0];

  if (!lightFile && !darkFile) {
    res.status(400);
    throw new Error("At least one of lightFile or darkFile is required.");
  }

  // Eski kayıt varsa, eski dosyayı sil
  let setting = await Setting.findOne({ key: trimmedKey });
  let oldFiles: string[] = [];

  // 💡 Sadece object ise eski dosyaları ekle
  if (
    setting &&
    setting.value &&
    typeof setting.value === "object" &&
    !Array.isArray(setting.value)
  ) {
    const val = setting.value as LogoSettingValue;
    if (lightFile && val.light) oldFiles.push(val.light);
    if (darkFile && val.dark) oldFiles.push(val.dark);
  }

  // Sil
  const env = process.env.APP_ENV || "ensotek";
  const folder = "setting-images";
  for (const fileName of oldFiles) {
    const absPath = path.join("uploads", env, folder, path.basename(fileName));
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  }

  // Yeni dosya pathlerini ayarla (sadece filename DB'de tutulur)
  const toUpdate: LogoSettingValue = {};
  if (lightFile) toUpdate.light = lightFile.filename;
  if (darkFile) toUpdate.dark = darkFile.filename;

  if (setting) {
    // Eğer eski value bir object ise merge et, değilse direkt toUpdate ile değiştir
    let merged: LogoSettingValue = { ...toUpdate };
    if (
      setting.value &&
      typeof setting.value === "object" &&
      !Array.isArray(setting.value)
    ) {
      merged = { ...(setting.value as LogoSettingValue), ...toUpdate };
    }
    setting.value = merged;
    await setting.save();
  } else {
    setting = await Setting.create({
      key: trimmedKey,
      value: toUpdate,
      isActive: true,
    });
  }

  res.status(200).json({
    success: true,
    message: "Logos uploaded and setting saved successfully.",
    data: setting,
  });
});


// 🎯 Update Setting Image (PUT)
export const updateSettingImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { key } = req.params;

  if (!key?.trim()) {
    res.status(400);
    throw new Error("Key parameter is required.");
  }

  const trimmedKey = key.trim();
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const lightFile = files?.lightFile?.[0];
  const darkFile = files?.darkFile?.[0];

  if (!lightFile && !darkFile) {
    res.status(400);
    throw new Error("At least one of lightFile or darkFile is required.");
  }

  const setting = await Setting.findOne({ key: trimmedKey });

  if (!setting) {
    res.status(404);
    throw new Error("Setting not found for the provided key.");
  }

  // Eski dosyaları sil
  const oldFilesToDelete: string[] = [];

  if (setting.value && typeof setting.value === "object" && !Array.isArray(setting.value)) {
    const val = setting.value as LogoSettingValue;
    if (lightFile && val.light) oldFilesToDelete.push(val.light);
    if (darkFile && val.dark) oldFilesToDelete.push(val.dark);
  } else if (typeof setting.value === "string") {
    oldFilesToDelete.push(setting.value);
  }

  oldFilesToDelete.forEach((fileName) => {
    const filePath = path.join(
      "uploads",
      process.env.APP_ENV || "ensotek",
      "setting-images",
      fileName
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  // Yeni değerler object'e dönüştürülüyor
  let newValues: LogoSettingValue = {};

  if (setting.value && typeof setting.value === "object" && !Array.isArray(setting.value)) {
    newValues = { ...(setting.value as LogoSettingValue) };
  }

  if (lightFile) newValues.light = lightFile.filename;
  if (darkFile) newValues.dark = darkFile.filename;

  setting.value = newValues;
  await setting.save();

  res.status(200).json({
    success: true,
    message: "Logos updated successfully.",
    data: setting,
  });
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

// 🎯 Delete Setting by Key
export const deleteSetting = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { key } = req.params;

  if (!key?.trim()) {
    res.status(400);
    throw new Error("Key parameter is required for deletion.");
  }

  const setting = await Setting.findOneAndDelete({ key: key.trim() });

  if (!setting) {
    res.status(404);
    throw new Error("Setting not found with the provided key.");
  }

  // 🗑 Dosyalar silinecek (hem string hem object destekli)
  if (setting.value) {
    const filePaths: string[] = [];

    if (typeof setting.value === "string") {
      filePaths.push(setting.value);
    } else if (typeof setting.value === "object") {
      Object.values(setting.value).forEach((val) => {
        if (typeof val === "string") filePaths.push(val);
      });
    }

    filePaths.forEach((fileName) => {
      const filePath = path.join(
        "uploads",
        process.env.APP_ENV || "ensotek",
        "setting-images",
        fileName
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }

  res.status(200).json({
    success: true,
    message: `Setting '${key}' has been deleted successfully.`,
  });
});
