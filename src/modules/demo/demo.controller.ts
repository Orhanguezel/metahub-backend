// src/modules/demo/demo.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import Demo from "./demo.models";
import { isValidObjectId } from "mongoose";

// ✅ Create Demo
export const createDemo = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.body;
    const created = await Demo.create({ name });

    res.status(201).json({
      success: true,
      message: "Demo created successfully.",
      data: created,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Get All Demos
export const getAllDemo = asyncHandler(async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const demos = await Demo.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Demo list fetched successfully.",
      data: demos,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Update Demo
export const updateDemo = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid demo ID." });
      return;
    }

    const demo = await Demo.findByIdAndUpdate(id, { name }, { new: true });

    if (!demo) {
      res.status(404).json({ success: false, message: "Demo not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Demo updated successfully.",
      data: demo,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Delete Demo
export const deleteDemo = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid demo ID." });
      return;
    }

    const demo = await Demo.findByIdAndDelete(id);

    if (!demo) {
      res.status(404).json({ success: false, message: "Demo not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Demo deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Ping Demo (API Key required)
export const pingDemo = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: "API Key is valid.",
  });
});
