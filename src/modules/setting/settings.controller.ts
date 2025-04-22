import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Setting from "./settings.models";

// 🔄 Create or Update Setting
export const upsertSetting = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { key, value } = req.body;

    if (!key || !value) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Schlüssel und Wert sind erforderlich."
            : req.locale === "tr"
            ? "Anahtar ve değer gereklidir."
            : "Key and value are required.",
      });
      return;
    }

    const setting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message:
        req.locale === "de"
          ? "Einstellung gespeichert."
          : req.locale === "tr"
          ? "Ayar kaydedildi."
          : "Setting saved.",
      setting,
    });
  }
);

// 📄 Get All Settings
export const getAllSettings = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const settings = await Setting.find().sort({ key: 1 });
    res.status(200).json(settings);
  }
);

// 🔍 Get Setting by Key
export const getSettingByKey = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { key } = req.params;
    const setting = await Setting.findOne({ key });

    if (!setting) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Einstellung nicht gefunden."
            : req.locale === "tr"
            ? "Ayar bulunamadı."
            : "Setting not found.",
      });
      return;
    }

    res.json(setting);
  }
);

// 🗑️ Delete Setting
export const deleteSetting = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { key } = req.params;
    const deleted = await Setting.findOneAndDelete({ key });

    if (!deleted) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Einstellung nicht gefunden."
            : req.locale === "tr"
            ? "Ayar bulunamadı."
            : "Setting not found.",
      });
      return;
    }

    res.json({
      message:
        req.locale === "de"
          ? "Einstellung gelöscht."
          : req.locale === "tr"
          ? "Ayar silindi."
          : "Setting deleted.",
      deleted,
    });
  }
);
