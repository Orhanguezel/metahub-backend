import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Public - Get all Activity (optional: filter by category, language)
export const getAllActivity = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { category, language } = req.query;
    const { Activity } = await getTenantModels(req);
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

    const activityList = await Activity.find(filter)
      .populate("category", "title")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Activity list fetched successfully.",
      data: activityList,
    });
  }
);

// ✅ Public - Get service by ID
export const getActivityById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { Activity } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid service ID." });
      return;
    }

    const activity = await Activity.findOne({
      _id: id,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("category", "title")
      .lean();

    if (!activity) {
      res.status(404).json({ success: false, message: "Service not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Service fetched successfully.",
      data: activity,
    });
  }
);

// ✅ Public - Get service by Slug
export const getActivityBySlug = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;
    const { Activity } = await getTenantModels(req);

    const activity = await Activity.findOne({
      slug,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("category", "title")
      .lean();

    if (!activity) {
      res.status(404).json({ success: false, message: "Service not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Service fetched successfully.",
      data: activity,
    });
  }
);
