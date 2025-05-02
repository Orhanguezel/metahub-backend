import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Setting } from "@/modules/setting";

// 🎯 Create or Update Setting
export const upsertSetting = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { key, value, isActive = true } = req.body;

  if (!key || value === undefined || value === null) {
    res.status(400).json({
      success: false,
      message: "Key and value are required.",
    });
    return 
  }
  

  const trimmedKey = key.trim();

  let finalValue: any = value;

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
    // 🎯 Yeni kayıt oluştur
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

  res.status(200).json({
    success: true,
    message: `Setting '${key}' has been deleted successfully.`,
  });
});
