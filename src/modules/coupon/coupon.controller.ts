import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Coupon from "./coupon.models";
import { isValidObjectId } from "../../core/utils/validation";

// 🎟️ Yeni kupon oluştur (her dil için ayrı kayıt)
export const createCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { code, discount, expiresAt } = req.body;
  const langs: ("tr" | "en" | "de")[] = ["tr", "en", "de"];
  const createdCoupons = [];

  if (!code || !discount || !expiresAt) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Erforderliche Felder fehlen."
          : req.locale === "tr"
          ? "Gerekli alanlar eksik."
          : "Required fields are missing.",
    });
    return;
  }

  const codeUpper = code.toUpperCase().trim();
  const exists = await Coupon.findOne({ code: codeUpper });
  if (exists) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Gutscheincode ist bereits vorhanden."
          : req.locale === "tr"
          ? "Kupon kodu zaten mevcut."
          : "Coupon code already exists.",
    });
    return;
  }

  for (const lang of langs) {
    const title = req.body[`title_${lang}`];
    const description = req.body[`description_${lang}`];

    if (!title) continue;

    const coupon = await Coupon.create({
      code: codeUpper,
      title,
      description,
      discount,
      expiresAt,
      isActive: true,
      language: lang,
    });

    createdCoupons.push(coupon);
  }

  if (createdCoupons.length === 0) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Keine gültigen Sprachdaten gefunden."
          : req.locale === "tr"
          ? "Hiçbir dil için geçerli veri girilmedi."
          : "No valid data provided for any language.",
    });
    return;
  }

  res.status(201).json({
    success: true,
    message:
      req.locale === "de"
        ? "Mehrsprachiger Gutschein erfolgreich erstellt."
        : req.locale === "tr"
        ? "Çok dilli kupon başarıyla oluşturuldu."
        : "Multi-language coupon created successfully.",
    coupons: createdCoupons,
  });
});

// 🧾 Tüm kuponları getir (dil filtreli)
export const getAllCoupons = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const language = (req.query.lang as string) || req.locale || "en";
  const coupons = await Coupon.find({ language }).sort({ createdAt: -1 });
  res.status(200).json(coupons);
});

// 🔍 Kod ile getir (tek dil)
export const getCouponByCode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { code } = req.params;
  const language = (req.query.lang as string) || req.locale || "en";

  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    language,
    isActive: true,
  });

  if (!coupon) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Gutschein nicht gefunden."
          : req.locale === "tr"
          ? "Kupon bulunamadı."
          : "Coupon not found.",
    });
    return;
  }

  res.status(200).json(coupon);
});

// ✏️ Kupon güncelle (tek belge)
export const updateCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid coupon ID" });
    return;
  }

  const coupon = await Coupon.findById(id);
  if (!coupon) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Gutschein nicht gefunden."
          : req.locale === "tr"
          ? "Kupon bulunamadı."
          : "Coupon not found.",
    });
    return;
  }

  const { code, title, description, discount, expiresAt, isActive, language } = req.body;

  if (code) coupon.code = code.toUpperCase().trim();
  if (title) coupon.title = title;
  if (description !== undefined) coupon.description = description;
  if (discount !== undefined) coupon.discount = discount;
  if (expiresAt) coupon.expiresAt = new Date(expiresAt);
  if (typeof isActive === "boolean") coupon.isActive = isActive;
  if (language) coupon.language = language;

  await coupon.save();
  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Gutschein erfolgreich aktualisiert."
        : req.locale === "tr"
        ? "Kupon başarıyla güncellendi."
        : "Coupon updated successfully.",
    coupon,
  });
});

// 🗑️ Kupon sil
export const deleteCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid coupon ID" });
    return;
  }

  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Gutschein nicht gefunden."
          : req.locale === "tr"
          ? "Kupon bulunamadı."
          : "Coupon not found.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Gutschein gelöscht."
        : req.locale === "tr"
        ? "Kupon silindi."
        : "Coupon deleted successfully.",
  });
});
