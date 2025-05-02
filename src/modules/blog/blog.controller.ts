import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import slugify from "slugify";
import { Blog } from "@/modules/blog";
import { isValidObjectId } from "@/core/utils/validation";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";
import { deleteUploadedFiles } from "@/core/utils/deleteUploadedFiles";

// ✅ Create Blog
export const createBlog = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
  const imageUrls = files?.map(file => `${BASE_URL}/${UPLOAD_BASE_PATH}/blog-images/${file.filename}`) || [];

  if (imageUrls.length === 0) {
    res.status(400).json({ success: false, message: "At least one image is required." });
    return;
  }

  const parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;

  const blog = await Blog.create({
    title,
    slug: slug || slugify(title, { lower: true, strict: true }),
    summary,
    content,
    category,
    tags: parsedTags,
    images: imageUrls,
    author: req.user?.name || "Unknown",
    isPublished: isPublished === "true" || isPublished === true,
    publishedAt: isPublished ? publishedAt || new Date() : undefined,
    label,
  });

  res.status(201).json({
    success: true,
    message: "Blog created successfully.",
    data: blog,
  });

  return;
});

// ✅ Get All Blogs
export const getAllBlogs = asyncHandler(async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
  const blogs = await Blog.find()
    .populate("category", "name")
    .populate("comments")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: blogs,
  });

  return;
});

// ✅ Get Blog by Slug
export const getBlogBySlug = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  const blog = await Blog.findOne({ slug: req.params.slug }).populate("comments");

  if (!blog) {
    res.status(404).json({ success: false, message: "Blog not found." });
    return;
  }

  res.status(200).json({
    success: true,
    data: blog,
  });

  return;
});

// ✅ Update Blog
export const updateBlog = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid blog ID." });
    return;
  }

  const blog = await Blog.findById(id);
  if (!blog) {
    res.status(404).json({ success: false, message: "Blog not found." });
    return;
  }

  const files = req.files as Express.Multer.File[];
  const newImages = files?.map(file => `${BASE_URL}/${UPLOAD_BASE_PATH}/blog-images/${file.filename}`) || [];

  if (updates.removedImages) {
    try {
      const removed: string[] = JSON.parse(updates.removedImages);
      blog.images = blog.images.filter((img) => !removed.includes(img));
      deleteUploadedFiles(removed, "blog");
    } catch (error) {
      console.error("Failed to parse removedImages:", error);
    }
  }

  blog.title = updates.title ?? blog.title;
  blog.slug = updates.slug ?? blog.slug;
  blog.summary = updates.summary ?? blog.summary;
  blog.content = updates.content ?? blog.content;
  blog.category = updates.category ?? blog.category;
  blog.tags = typeof updates.tags === "string" ? JSON.parse(updates.tags) : updates.tags ?? blog.tags;
  blog.isPublished = typeof updates.isPublished === "boolean" ? updates.isPublished : blog.isPublished;
  blog.publishedAt = updates.publishedAt ? new Date(updates.publishedAt) : blog.publishedAt;
  blog.label = updates.label ?? blog.label;
  blog.images = newImages.length > 0 ? [...blog.images, ...newImages] : blog.images;

  await blog.save();

  res.status(200).json({
    success: true,
    message: "Blog updated successfully.",
    data: blog,
  });

  return;
});

// ✅ Delete Blog
export const deleteBlog = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid blog ID." });
    return;
  }

  const blog = await Blog.findById(id);
  if (!blog) {
    res.status(404).json({ success: false, message: "Blog not found." });
    return;
  }

  if (blog.images.length > 0) {
    deleteUploadedFiles(blog.images, "blog");
  }

  await blog.deleteOne();

  res.status(200).json({
    success: true,
    message: "Blog deleted successfully.",
  });

  return;
});
