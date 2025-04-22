import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import slugify from "slugify";
import Blog from "./blog.models";
import { isValidObjectId } from "../../core/utils/validation";
import { BASE_URL,UPLOAD_BASE_PATH } from "../../core/middleware/uploadMiddleware";
import { deleteUploadedFiles } from "../../core/utils/deleteUploadedFiles";

// ✅ Çok dilli blog oluştur
export const createBlog = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { category, tags, isPublished, publishedAt } = req.body;

    const files = req.files as Express.Multer.File[];
    const imageUrls =
      files?.map(
        (file) => `${BASE_URL}/${UPLOAD_BASE_PATH}/blog-images/${file.filename}`
      ) || [];

    if (imageUrls.length === 0) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Mindestens ein Bild erforderlich."
            : req.locale === "tr"
            ? "En az bir görsel gereklidir."
            : "At least one image is required.",
      });
      return;
    }

    const parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
    const languages: ("tr" | "en" | "de")[] = ["tr", "en", "de"];
    const createdBlogs = [];

    for (const lang of languages) {
      const title = req.body[`title_${lang}`];
      const content = req.body[`content_${lang}`];
      const slug = req.body[`slug_${lang}`];
      const summary = req.body[`summary_${lang}`];

      // ✅ summary zorunlu olduğu için kontrole dahil edildi
      if (!title || !content || !slug || !summary) continue;

      const blog = await Blog.create({
        title,
        content,
        slug,
        summary,
        category,
        images: imageUrls,
        tags: parsedTags,
        author: req.user?.name,
        language: lang,
        isPublished: isPublished === "true" || isPublished === true,
        publishedAt: isPublished ? publishedAt || new Date() : undefined,
      });

      createdBlogs.push(blog);
    }

    if (createdBlogs.length === 0) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Keine gültigen Daten für eine Sprache vorhanden."
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
          ? "Mehrsprachiger Blog erfolgreich erstellt."
          : req.locale === "tr"
          ? "Çok dilli blog başarıyla oluşturuldu."
          : "Multi-language blog created successfully.",
      blog: createdBlogs,
    });
  }
);

// ✅ Tüm blogları getir
export const getAllBlogs = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { category, language } = req.query;

    const filter: any = {};
    if (category) filter.category = category;
    filter.language = language || req.locale || "en";

    const blogs = await Blog.find(filter)
      .populate("comments")
      .sort({ createdAt: -1 });

    res.status(200).json(blogs);
  }
);

// ✅ Slug ile blog getir
export const getBlogBySlug = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const blog = await Blog.findOne({ slug: req.params.slug }).populate(
      "comments"
    );

    if (!blog) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Blog nicht gefunden."
            : req.locale === "tr"
            ? "Blog bulunamadı."
            : "Blog not found.",
      });
      return;
    }

    res.status(200).json(blog);
  }
);

// src/controllers/blog.controller.ts
export const updateBlog = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updates = req.body;

    const blog = await Blog.findById(id);
    if (!blog) {
      res.status(404).json({ message: "Blog not found" });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const newImages =
      files?.map(
        (file) => `${BASE_URL}/${UPLOAD_BASE_PATH}/blog-images/${file.filename}`
      ) || [];

    // 🔴 Silinen görseller (hem db'den çıkar hem fs'den sil)
    if (updates.removedImages) {
      try {
        const removed: string[] = JSON.parse(updates.removedImages);
        blog.images = blog.images.filter((img) => !removed.includes(img));
        deleteUploadedFiles(removed, "blog"); // <-- burada fiziksel silme yapılıyor
      } catch (error) {
        console.error(
          "⚠️ Failed to parse removedImages or delete files:",
          error
        );
      }
    }

    // 🧠 Alan güncellemeleri
    blog.title = updates.title ?? blog.title;
    blog.slug = updates.slug ?? blog.slug;
    blog.summary = updates.summary ?? blog.summary;
    blog.content = updates.content ?? blog.content;
    blog.category = updates.category ?? blog.category;
    blog.language = updates.language ?? blog.language;

    if (updates.tags) {
      blog.tags =
        typeof updates.tags === "string"
          ? JSON.parse(updates.tags)
          : updates.tags;
    }

    if (
      typeof updates.isPublished === "boolean" ||
      updates.isPublished === "true" ||
      updates.isPublished === "false"
    ) {
      blog.isPublished =
        updates.isPublished === "true" || updates.isPublished === true;
    }

    if (updates.publishedAt) {
      blog.publishedAt = new Date(updates.publishedAt);
    }

    // 📷 Yeni görseller
    if (newImages.length > 0) {
      blog.images = [...blog.images, ...newImages];
    }

    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      blog,
    });
  }
);

export const deleteBlog = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid blog ID" });
      return;
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Blog nicht gefunden."
            : req.locale === "tr"
            ? "Blog bulunamadı."
            : "Blog not found.",
      });
      return;
    }

    // 🧹 Fiziksel görselleri sil
    if (blog.images && blog.images.length > 0) {
      deleteUploadedFiles(blog.images, "blog");
    }

    // 🔥 Veritabanından sil
    await blog.deleteOne();

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Blog erfolgreich gelöscht."
          : req.locale === "tr"
          ? "Blog başarıyla silindi."
          : "Blog deleted successfully.",
    });
  }
);
