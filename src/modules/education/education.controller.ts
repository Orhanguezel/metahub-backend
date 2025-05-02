import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import {Education} from "../education";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Get All Education
export const getAllEducation = asyncHandler(async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const education = await Education.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: education,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Get Single Education by ID
export const getEducationById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid education ID." });
      return;
    }

    const education = await Education.findById(id);
    if (!education) {
      res.status(404).json({ success: false, message: "Education entry not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: education,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Create Education
export const createEducation = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { degree, institution, period, image } = req.body;

    if (
      !degree?.tr || !degree?.en || !degree?.de ||
      !institution?.tr || !institution?.en || !institution?.de ||
      !period
    ) {
      res.status(400).json({ success: false, message: "All fields (degree, institution, period, translations) are required." });
      return;
    }

    const newEducation = await Education.create({
      degree,
      institution,
      period,
      image,
    });

    res.status(201).json({
      success: true,
      message: "Education entry created successfully.",
      data: newEducation,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Update Education
export const updateEducation = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid education ID." });
      return;
    }

    const updated = await Education.findByIdAndUpdate(id, req.body, { new: true });

    if (!updated) {
      res.status(404).json({ success: false, message: "Education entry not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Education entry updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Delete Education
export const deleteEducation = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid education ID." });
      return;
    }

    const deleted = await Education.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({ success: false, message: "Education entry not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Education entry deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});
