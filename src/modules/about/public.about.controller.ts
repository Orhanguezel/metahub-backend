import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { About } from ".";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Public - Get all About (optional: filter by category, language)
export const getAllAbout = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { category, language } = req.query;
    const filter: Record<string, any> = {
      isActive: true,
      tenant: req.tenant,
      isPublished: true,
    };

    if (category && isValidObjectId(category.toString())) {
      filter.category = category;
    }

    if (typeof language === "string" && ["tr", "en", "de"].includes(language)) {
      filter[`title.${language}`] = { $exists: true };
    }

    const aboutList = await About.find(filter)
      .populate("category", "title")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "About list fetched successfully.",
      data: aboutList,
    });
  }
);

// ✅ Public - Get service by ID
export const getAboutById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid service ID." });
      return;
    }

    const about = await About.findOne({
      _id: id,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("category", "title")
      .lean();

    if (!about) {
      res.status(404).json({ success: false, message: "Service not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Service fetched successfully.",
      data: about,
    });
  }
);

// ✅ Public - Get service by Slug
export const getAboutBySlug = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;

    const about = await About.findOne({
      slug,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("category", "title")
      .lean();

    if (!about) {
      res.status(404).json({ success: false, message: "Service not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Service fetched successfully.",
      data: about,
    });
  }
);
