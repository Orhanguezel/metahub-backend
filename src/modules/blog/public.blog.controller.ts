import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Blog } from ".";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Get All Blog (public)
export const getAllBlog = asyncHandler(async (req: Request, res: Response) => {
  const { category, language } = req.query;
  const filter: any = { isActive: true, isPublished: true };

  if (category && isValidObjectId(category.toString())) {
    filter.category = category;
  }

  // Add language-specific check: only return Blog that has that language field
  if (language && ["tr", "en", "de"].includes(language.toString())) {
    filter[`title.${language}`] = { $exists: true };
  }
  const defaultPopulate = [
    { path: "comments" },
    { path: "category", select: "title" },
  ];

  const blogList = await Blog.find(filter)
    .populate(defaultPopulate)
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    message: "Blog list fetched successfully.",
    data: blogList,
  });
});

// ✅ Get Blog by ID (public)
export const getBlogById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid Blog ID." });
    return;
  }

  const blog = await Blog.findOne({
    _id: id,
    isActive: true,
    isPublished: true,
  })
    .populate("comments")
    .populate("category", "title")
    .lean();

  if (!blog) {
    res.status(404).json({ success: false, message: "Blog not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Blog fetched successfully.",
    data: blog,
  });
});

// ✅ Get Blog by Slug (public)
export const getBlogBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const { slug } = req.params;

    const blog = await Blog.findOne({ slug, isActive: true, isPublished: true })
      .populate("comments")
      .populate("category", "title")
      .lean();

    if (!blog) {
      res.status(404).json({ success: false, message: "Blog not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Blog fetched successfully.",
      data: blog,
    });
  }
);
