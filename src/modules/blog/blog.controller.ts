import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import slugify from "slugify";
import Blog from "./blog.models";
import { isValidObjectId } from "../../core/utils/validation";
import { BASE_URL, UPLOAD_BASE_PATH } from "../../core/middleware/uploadMiddleware";
import { deleteUploadedFiles } from "../../core/utils/deleteUploadedFiles";

// ✅ Blog oluştur (tek dil)
export const createBlog = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      title,
      slug,
      summary,
      content,
      category,
      tags,
      isPublished,
      publishedAt,
      label,
    } = req.body;

    const files = req.files as Express.Multer.File[];
    const imageUrls = files?.map(
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

    if (!title || !slug || !summary || !content || !label?.tr || !label?.en || !label?.de) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Alle Pflichtfelder müssen ausgefüllt werden."
            : req.locale === "tr"
            ? "Lütfen tüm gerekli alanları doldurun."
            : "Please fill all required fields.",
      });
      return;
    }

    const parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;

    const blog = await Blog.create({
      title,
      slug,
      summary,
      content,
      category,
      tags: parsedTags,
      author: req.user?.name,
      images: imageUrls,
      isPublished: isPublished === "true" || isPublished === true,
      publishedAt: isPublished ? publishedAt || new Date() : undefined,
      label,
    });

    res.status(201).json({
      success: true,
      message:
        req.locale === "de"
          ? "Blog erfolgreich erstellt."
          : req.locale === "tr"
          ? "Blog başarıyla oluşturuldu."
          : "Blog created successfully.",
      blog,
    });
  }
);

// ✅ Tüm blogları getir
export const getAllBlogs = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { category, language } = req.query;
    const filter: any = {};

    if (category) filter.category = category;
    filter.label = { $exists: true };

    const blogs = await Blog.find(filter)
      .populate("comments")
      .sort({ createdAt: -1 });

    res.status(200).json(blogs);
  }
);

// ✅ Slug ile blog getir
export const getBlogBySlug = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const blog = await Blog.findOne({ slug: req.params.slug }).populate("comments");

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

// ✅ Blog güncelle
export const updateBlog = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updates = req.body;

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

    const files = req.files as Express.Multer.File[];
    const newImages = files?.map(
      (file) => `${BASE_URL}/${UPLOAD_BASE_PATH}/blog-images/${file.filename}`
    ) || [];

    if (updates.removedImages) {
      try {
        const removed: string[] = JSON.parse(updates.removedImages);
        blog.images = blog.images.filter((img) => !removed.includes(img));
        deleteUploadedFiles(removed, "blog");
      } catch (error) {
        console.error("⚠️ Failed to parse removedImages or delete files:", error);
      }
    }

    blog.title = updates.title ?? blog.title;
    blog.slug = updates.slug ?? blog.slug;
    blog.summary = updates.summary ?? blog.summary;
    blog.content = updates.content ?? blog.content;
    blog.category = updates.category ?? blog.category;

    if (updates.label) blog.label = updates.label;

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

    if (newImages.length > 0) {
      blog.images = [...blog.images, ...newImages];
    }

    await blog.save();

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Blog erfolgreich aktualisiert."
          : req.locale === "tr"
          ? "Blog başarıyla güncellendi."
          : "Blog updated successfully.",
      blog,
    });
  }
);

// ✅ Blog sil
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

    if (blog.images && blog.images.length > 0) {
      deleteUploadedFiles(blog.images, "blog");
    }

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
