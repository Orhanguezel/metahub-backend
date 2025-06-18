import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
//import { Feedback } from "@/modules/feedback";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// 💬 Create Feedback
export const createFeedback = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { Feedback } = await getTenantModels(req);
    const { name, email, message, rating } = req.body;

    const langs: ("tr" | "en" | "de")[] = ["tr", "en", "de"];
    const isValidMessage = langs.every((l) => message?.[l]);

    if (!name || !email || !isValidMessage) {
      res.status(400).json({
        success: false,
        message: "All required fields must be filled.",
      });
      return;
    }

    const feedback = await Feedback.create({
      name,
      email,
      message,
      tenant: req.tenant,
      rating,
      isPublished: false,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully.",
      data: feedback,
    });
  }
);

// 🔐 Get All Feedbacks (Admin)
export const getAllFeedbacks = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { Feedback } = await getTenantModels(req);
    const lang = (req.query.lang as string) || req.locale || "en";
    const filter = {
      [`message.${lang}`]: { $exists: true },
      tenant: req.tenant,
    };

    const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: feedbacks,
    });
  }
);

// 🔁 Toggle Publish
export const togglePublishFeedback = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { Feedback } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid ID" });
      return;
    }

    const feedback = await Feedback.findOne({ _id: id, tenant: req.tenant });
    if (!feedback) {
      res.status(404).json({
        success: false,
        message: "Feedback not found.",
      });
      return;
    }

    feedback.isPublished = !feedback.isPublished;
    await feedback.save();

    res.status(200).json({
      success: true,
      message: `Feedback ${
        feedback.isPublished ? "published" : "unpublished"
      }.`,
      data: feedback,
    });
  }
);

// ❌ Delete Feedback
export const deleteFeedback = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { Feedback } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid ID" });
      return;
    }

    const feedback = await Feedback.deleteOne({ _id: id, tenant: req.tenant });
    if (!feedback) {
      res.status(404).json({
        success: false,
        message: "Feedback not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Feedback deleted successfully.",
    });
  }
);

// ✏️ Update Feedback
export const updateFeedback = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;
    const { Feedback } = await getTenantModels(req);
    const { name, email, message, rating, isPublished, isActive } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid ID" });
      return;
    }

    const feedback = await Feedback.findOne({ _id: id, tenant: req.tenant });
    if (!feedback) {
      res.status(404).json({
        success: false,
        message: "Feedback not found.",
      });
      return;
    }

    if (name) feedback.name = name;
    if (email) feedback.email = email;
    if (message) feedback.message = message;
    if (rating !== undefined) feedback.rating = rating;
    if (typeof isPublished === "boolean") feedback.isPublished = isPublished;
    if (typeof isActive === "boolean") feedback.isActive = isActive;

    await feedback.save();

    res.status(200).json({
      success: true,
      message: "Feedback updated.",
      data: feedback,
    });
  }
);

// 🌍 Get Published Feedbacks (Public)
export const getPublishedFeedbacks = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { Feedback } = await getTenantModels(req);
    const feedbacks = await Feedback.find({
      isPublished: true,
      isActive: true,
      tenant: req.tenant,
      [`message.${req.locale || "en"}`]: { $exists: true },
    }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: feedbacks,
    });
  }
);

// ❌ Soft Delete (isActive: false)
export const softDeleteFeedback = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { Feedback } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid ID" });
      return;
    }

    const feedback = await Feedback.findOne({ _id: id, tenant: req.tenant });
    if (!feedback) {
      res.status(404).json({
        success: false,
        message: "Feedback not found.",
      });
      return;
    }

    feedback.isActive = false;
    await feedback.save();

    res.status(200).json({
      success: true,
      message: "Feedback archived.",
    });
  }
);
