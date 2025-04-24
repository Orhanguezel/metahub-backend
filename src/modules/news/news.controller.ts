import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import News from "./news.models";
import { BASE_URL, UPLOAD_BASE_PATH } from "../../core/middleware/uploadMiddleware";
import { isValidObjectId } from "../../core/utils/validation";

// ✅ Çoklu dilde haber oluşturma (çoklu görselli)
export const createNews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { category, tags, isPublished, publishedAt } = req.body;

  const files = req.files as Express.Multer.File[];
  const imageUrls = files?.map(file => `${BASE_URL}/${UPLOAD_BASE_PATH}/news-images/${file.filename}`) || [];

  if (imageUrls.length === 0) {
    res.status(400).json({
      message: req.locale === "de"
        ? "Mindestens ein Bild erforderlich."
        : req.locale === "tr"
        ? "En az bir görsel gereklidir."
        : "At least one image is required.",
    });
    return;
  }

  const parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
  const languages: ("tr" | "en" | "de")[] = ["tr", "en", "de"];
  const createdNews = [];

  for (const lang of languages) {
    const title = req.body[`title_${lang}`];
    const summary = req.body[`summary_${lang}`];
    const content = req.body[`content_${lang}`];
    const slug = req.body[`slug_${lang}`];

    if (!title || !summary || !content || !slug) continue;

    const news = await News.create({
      title,
      slug,
      summary,
      content,
      images: imageUrls,
      tags: parsedTags || [],
      category,
      author: req.user?.name,
      language: lang,
      isPublished: isPublished === "true" || isPublished === true,
      publishedAt: isPublished ? publishedAt || new Date() : undefined,
    });

    createdNews.push(news);
  }

  if (createdNews.length === 0) {
    res.status(400).json({
      message: req.locale === "de"
        ? "Keine gültigen Daten für eine Sprache vorhanden."
        : req.locale === "tr"
        ? "Hiçbir dil için geçerli veri girilmedi."
        : "No valid data provided for any language.",
    });
    return;
  }

  res.status(201).json({
    success: true,
    message: req.locale === "de"
      ? "Mehrsprachige Nachricht(en) erfolgreich erstellt."
      : req.locale === "tr"
      ? "Çok dilli haber(ler) başarıyla oluşturuldu."
      : "Multi-language news created successfully.",
    news: createdNews,
  });
});

// ✅ Tüm haberleri getir (dil ve kategori ile)
export const getAllNews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { category, language } = req.query;
  const filter: any = {};

  if (category) filter.category = category;
  filter.language = language || req.locale || "en";

  const newsList = await News.find(filter).populate("comments").sort({ publishedAt: -1 });

  res.status(200).json(newsList);
});

// ✅ Slug ile haber getir
export const getNewsBySlug = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const news = await News.findOne({ slug: req.params.slug }).populate("comments");

  if (!news) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Nachricht nicht gefunden."
        : req.locale === "tr"
        ? "Haber bulunamadı."
        : "News not found.",
    });
    return;
  }

  res.status(200).json(news);
});

// ✅ ID ile haber getir
export const getNewsById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const news = await News.findById(req.params.id).populate("comments");

  if (!news) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Nachricht nicht gefunden."
        : req.locale === "tr"
        ? "Haber bulunamadı."
        : "News not found.",
    });
    return;
  }

  res.status(200).json(news);
});

// ✅ Haberi güncelle (kısmi ve çoklu resim destekli)
export const updateNews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates: any = { ...req.body };

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid news ID" });
    return;
  }

  const news = await News.findById(id);
  if (!news) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Nachricht nicht gefunden."
        : req.locale === "tr"
        ? "Haber bulunamadı."
        : "News not found.",
    });
    return;
  }

  // 🔄 Alanlara göre güncelleme
  const updatableFields = ["title", "summary", "content", "slug", "category", "author", "language"];
  updatableFields.forEach((field) => {
    if (updates[field]) news[field] = updates[field];
  });

  // Etiket güncelleme
  if (updates.tags) {
    try {
      news.tags = typeof updates.tags === "string" ? JSON.parse(updates.tags) : updates.tags;
    } catch {}
  }

  // Yayın durumu
  if (typeof updates.isPublished !== "undefined") {
    news.isPublished = updates.isPublished === "true" || updates.isPublished === true;
  }

  // Yayın tarihi
  if (updates.publishedAt) {
    news.publishedAt = new Date(updates.publishedAt);
  }

  // Yeni resimler
  const files = req.files as Express.Multer.File[];
  const newImages = files?.map(file => `${BASE_URL}/${UPLOAD_BASE_PATH}/news-images/${file.filename}`) || [];

  if (newImages.length > 0) {
    news.images.push(...newImages);
  }

  // Silinen resimleri çıkar
  if (updates.removedImages) {
    try {
      const removed = JSON.parse(updates.removedImages);
      news.images = news.images.filter((img: string) => !removed.includes(img));
    } catch {}
  }

  await news.save();

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Nachricht erfolgreich aktualisiert."
      : req.locale === "tr"
      ? "Haber başarıyla güncellendi."
      : "News updated successfully.",
    news: await news.populate("comments"),
  });
});

// ✅ Haberi sil
export const deleteNews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const deleted = await News.findByIdAndDelete(req.params.id);

  if (!deleted) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Nachricht nicht gefunden."
        : req.locale === "tr"
        ? "Haber bulunamadı."
        : "News not found.",
    });
    
  }

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Nachricht erfolgreich gelöscht."
      : req.locale === "tr"
      ? "Haber başarıyla silindi."
      : "News deleted successfully.",
  });
});
