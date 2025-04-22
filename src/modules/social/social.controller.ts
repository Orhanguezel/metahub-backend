import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import SocialMedia from "./social.models";

// 🔹 Sosyal medya linklerini getir (isteğe bağlı dil)
export const getAllSocialLinks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const lang = req.query.lang || req.locale || "en";

  const socials = await SocialMedia.find({ language: lang }).sort({ createdAt: -1 });
  res.status(200).json(socials);
});

// 🔹 Yeni sosyal medya bağlantısı ekle
export const createSocialLink = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { platform, link, icon, language } = req.body;

  if (!platform || !link) {
    res.status(400).json({
      success: false,
      message:
        req.locale === "de"
          ? "Plattform und Link sind erforderlich."
          : req.locale === "tr"
          ? "Platform ve bağlantı zorunludur."
          : "Platform and link are required.",
    });
    return;
  }

  const social = await SocialMedia.create({
    platform,
    link,
    icon,
    language: language || req.locale || "en",
  });

  res.status(201).json({
    success: true,
    message:
      req.locale === "de"
        ? "Social-Media-Link erfolgreich hinzugefügt."
        : req.locale === "tr"
        ? "Sosyal medya bağlantısı eklendi."
        : "Social media link created successfully.",
    social,
  });
});
