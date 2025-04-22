import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Article from "./articles.models";
import { BASE_URL } from "../../core/middleware/uploadMiddleware";
import { isValidObjectId } from "../../core/utils/validation";

// ✅ Çoklu dilde makale oluştur (çoklu görselli)
export const createArticle = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const langs: ("tr" | "en" | "de")[] = ["tr", "en", "de"];

    const files = req.files as Express.Multer.File[];
    const imageUrls =
      files?.map(
        (file) => `${BASE_URL}/uploads/article-images/${file.filename}`
      ) || [];

    if (imageUrls.length === 0) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Mindestens ein Bild ist erforderlich."
            : req.locale === "tr"
            ? "En az bir görsel gereklidir."
            : "At least one image is required.",
      });
      return;
    }

    const createdArticles = [];

    for (const lang of langs) {
      const data = req.body[lang];

      if (!data?.title || !data?.summary || !data?.content || !data?.slug)
        continue;

      const parsedTags =
        typeof data.tags === "string" ? JSON.parse(data.tags) : data.tags;

      const article = await Article.create({
        title: data.title,
        summary: data.summary,
        content: data.content,
        slug: data.slug,
        tags: parsedTags || [],
        category: data.category,
        language: lang,
        isPublished:
          req.body.isPublished === "true" || req.body.isPublished === true,
        publishedAt: req.body.isPublished
          ? req.body.publishedAt || new Date()
          : undefined,
        author: req.user?.name,
        images: imageUrls,
      });

      createdArticles.push(article);
    }

    if (createdArticles.length === 0) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Keine gültigen Artikel zum Erstellen gefunden."
            : req.locale === "tr"
            ? "Geçerli makale verisi girilmedi."
            : "No valid article data provided.",
      });
      return;
    }

    res.status(201).json({
      success: true,
      message:
        req.locale === "de"
          ? "Mehrsprachige Artikel erfolgreich erstellt."
          : req.locale === "tr"
          ? "Çok dilli makale(ler) başarıyla oluşturuldu."
          : "Multi-language articles created successfully.",
      articles: createdArticles,
    });
  }
);

// ✅ Tüm makaleleri getir (kategori ve dil filtresi destekli)
export const getAllArticles = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { category, language } = req.query;
    const filter: any = {};
    if (category) filter.category = category;
    filter.language = language || req.locale || "en";

    const articles = await Article.find(filter)
      .populate("comments")
      .sort({ publishedAt: -1 });

    res.status(200).json(articles);
  }
);

// ✅ Slug ile tek makale getir
export const getArticleBySlug = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const article = await Article.findOne({ slug: req.params.slug }).populate(
      "comments"
    );

    if (!article) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Artikel nicht gefunden."
            : req.locale === "tr"
            ? "Makale bulunamadı."
            : "Article not found.",
      });
      return;
    }

    res.status(200).json(article);
  }
);

// ✅ ID ile makale getir
export const getArticleById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const article = await Article.findById(req.params.id).populate("comments");

    if (!article) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Artikel nicht gefunden."
            : req.locale === "tr"
            ? "Makale bulunamadı."
            : "Article not found.",
      });
      return;
    }

    res.status(200).json(article);
  }
);

// ✅ Makale güncelle

export const updateArticle = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid article ID" });
      return;
    }

    const article = await Article.findById(id);
    if (!article) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Artikel nicht gefunden."
            : req.locale === "tr"
            ? "Makale bulunamadı."
            : "Article not found.",
      });
      return;
    }

    const {
      title,
      summary,
      content,
      slug,
      category,
      tags,
      language,
      isPublished,
      publishedAt,
      removedImages,
    } = req.body;

    // Yeni görseller
    const files = req.files as Express.Multer.File[];
    const newImages =
      files?.map(
        (file) => `${BASE_URL}/uploads/article-images/${file.filename}`
      ) || [];

    // 🧠 Kısmi güncelleme
    if (title) article.title = title;
    if (summary) article.summary = summary;
    if (content) article.content = content;
    if (slug) article.slug = slug;
    if (category) article.category = category;
    if (language) article.language = language;
    if (typeof isPublished !== "undefined")
      article.isPublished = isPublished === "true" || isPublished === true;
    if (publishedAt) article.publishedAt = new Date(publishedAt);

    // Etiketler (tags)
    if (tags) {
      try {
        article.tags = typeof tags === "string" ? JSON.parse(tags) : tags;
      } catch {
        // Geçersizse güncelleme
      }
    }

    // Silinen görselleri çıkart
    if (removedImages) {
      try {
        const toRemove = JSON.parse(removedImages);
        article.images = article.images.filter(
          (img) => !toRemove.includes(img)
        );
      } catch {
        // Geçersiz format
      }
    }

    // Yeni görselleri ekle
    if (newImages.length > 0) {
      article.images = [...article.images, ...newImages];
    }

    // 💾 Kaydet
    await article.save();

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Artikel erfolgreich aktualisiert."
          : req.locale === "tr"
          ? "Makale başarıyla güncellendi."
          : "Article updated successfully.",
      article: await article.populate("comments"),
    });
  }
);

// ✅ Makale sil
export const deleteArticle = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const deleted = await Article.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Artikel nicht gefunden."
            : req.locale === "tr"
            ? "Makale bulunamadı."
            : "Article not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Artikel erfolgreich gelöscht."
          : req.locale === "tr"
          ? "Makale başarıyla silindi."
          : "Article deleted successfully.",
    });
  }
);
