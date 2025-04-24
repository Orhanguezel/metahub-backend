import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import SocialMedia from "./social.models";

// ✅ Tüm sosyal medya bağlantılarını getir (dile göre filtreleme opsiyonel)
export const getAllSocialLinks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const socials = await SocialMedia.find().sort({ createdAt: -1 });
  res.status(200).json(socials);
});

// ✅ Yeni sosyal medya bağlantısı oluştur (çok dilli)
export const createSocialLink = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { platform, link, icon } = req.body;

  if (
    !platform?.tr || !platform?.en || !platform?.de ||
    !link
  ) {
    res.status(400).json({
      success: false,
      message:
        req.locale === "de"
          ? "Plattform (mehrsprachig) und Link sind erforderlich."
          : req.locale === "tr"
          ? "Platform (çok dilli) ve bağlantı zorunludur."
          : "Platform (multilingual) and link are required.",
    });
    return;
  }

  const social = await SocialMedia.create({
    platform,
    link,
    icon,
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

// 🔍 Tek sosyal medya linki getir
export const getSocialLinkById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const social = await SocialMedia.findById(req.params.id);
  if (!social) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Social-Media-Link nicht gefunden."
        : req.locale === "tr"
        ? "Sosyal medya bağlantısı bulunamadı."
        : "Social media link not found.",
    });
    return;
  }

  res.status(200).json(social);
});

// ✏️ Sosyal medya linki güncelle
export const updateSocialLink = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const social = await SocialMedia.findById(req.params.id);
  if (!social) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Social-Media-Link nicht gefunden."
        : req.locale === "tr"
        ? "Sosyal medya bağlantısı bulunamadı."
        : "Social media link not found.",
    });
    return;
  }

  const { platform, link, icon } = req.body;

  social.platform = platform ?? social.platform;
  social.link = link ?? social.link;
  social.icon = icon ?? social.icon;

  await social.save();

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Social-Media-Link aktualisiert."
      : req.locale === "tr"
      ? "Sosyal medya bağlantısı güncellendi."
      : "Social media link updated successfully.",
    social,
  });
});

// ❌ Sosyal medya linki sil
export const deleteSocialLink = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const social = await SocialMedia.findByIdAndDelete(req.params.id);
  if (!social) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Social-Media-Link nicht gefunden oder bereits gelöscht."
        : req.locale === "tr"
        ? "Sosyal medya bağlantısı bulunamadı veya zaten silinmiş."
        : "Social media link not found or already deleted.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Social-Media-Link gelöscht."
      : req.locale === "tr"
      ? "Sosyal medya bağlantısı silindi."
      : "Social media link deleted successfully.",
  });
});

