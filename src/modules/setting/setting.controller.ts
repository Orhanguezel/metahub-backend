import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Setting from "./setting.models";

// ➕ Create or Update Setting
export const upsertSetting = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { key, value, description, isActive } = req.body;

  const setting = await Setting.findOneAndUpdate(
    { key },
    {
      value,
      description,
      isActive: typeof isActive === "boolean" ? isActive : true,
    },
    { new: true, upsert: true }
  );

  res.status(200).json({
    success: true,
    message: "Setting saved successfully.",
    data: setting,
  });

  return;
});

// 📋 Get All Settings
export const getAllSettings = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const settings = await Setting.find().sort({ key: 1 });

  res.status(200).json({
    success: true,
    data: settings,
  });

  return;
});

// 🔍 Get Setting by Key
export const getSettingByKey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { key } = req.params;

  const setting = await Setting.findOne({ key });

  if (!setting) {
    res.status(404).json({
      success: false,
      message: "Setting not found.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: setting,
  });

  return;
});

// 🗑️ Delete Setting
export const deleteSetting = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { key } = req.params;

  const deleted = await Setting.findOneAndDelete({ key });

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: "Setting not found.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Setting deleted successfully.",
  });

  return;
});
